//! Repairs taskbar pins left behind by MSI installs up to 1.0.11.
//!
//! Those installers gave the Start Menu shortcut an icon stored under
//! `C:\Windows\Installer\{ProductCode}`. Every MSI upgrade has a new
//! ProductCode and deletes the old folder, so a pin copied from that
//! shortcut lost its icon on each update. The installer no longer does this
//! (see `windows/main.wxs`); this fixes pins users already have by pointing
//! their icon at our own exe. Only shortcuts that launch this exe are touched.

use std::path::{Path, PathBuf};

use windows::core::{Interface, HSTRING, PCWSTR};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, IPersistFile, CLSCTX_INPROC_SERVER,
    COINIT_APARTMENTTHREADED, STGM_READWRITE,
};
use windows::Win32::UI::Shell::{
    IShellLinkW, SHChangeNotify, ShellLink, SHCNE_ASSOCCHANGED, SHCNF_IDLIST,
};

/// Runs on its own thread so a slow shell call never delays startup.
pub fn repair() {
    std::thread::spawn(|| {
        let (Ok(exe), Some(appdata)) = (std::env::current_exe(), std::env::var_os("APPDATA"))
        else {
            return;
        };
        let pins = PathBuf::from(appdata)
            .join(r"Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar");
        let Ok(entries) = std::fs::read_dir(&pins) else {
            return;
        };
        let links: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.extension().is_some_and(|x| x.eq_ignore_ascii_case("lnk")))
            .collect();
        if links.is_empty() {
            return;
        }

        unsafe {
            if CoInitializeEx(None, COINIT_APARTMENTTHREADED).is_err() {
                return;
            }
            let mut fixed = false;
            for link in &links {
                fixed |= repair_link(link, &exe).unwrap_or(false);
            }
            if fixed {
                // Ask Explorer to redraw icons instead of waiting for a sign-out.
                SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, None, None);
            }
            CoUninitialize();
        }
    });
}

/// True when the icon of a shortcut that launches `exe` was rewritten.
unsafe fn repair_link(link: &Path, exe: &Path) -> windows::core::Result<bool> {
    let shell_link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
    let file: IPersistFile = shell_link.cast()?;
    let link_w = HSTRING::from(link.as_os_str());
    file.Load(PCWSTR(link_w.as_ptr()), STGM_READWRITE)?;

    let mut target = [0u16; 260];
    shell_link.GetPath(&mut target, std::ptr::null_mut(), 0)?;
    if !same_path(&from_wide(&target), exe) {
        return Ok(false);
    }

    let mut icon = [0u16; 260];
    let mut index = 0;
    shell_link.GetIconLocation(&mut icon, &mut index)?;
    if !needs_repair(&from_wide(&icon)) {
        return Ok(false);
    }

    let exe_w = HSTRING::from(exe.as_os_str());
    shell_link.SetIconLocation(PCWSTR(exe_w.as_ptr()), 0)?;
    file.Save(PCWSTR::null(), true)?;
    Ok(true)
}

/// An icon needs fixing when it lives in the Windows Installer cache (gone
/// after the next MSI upgrade) or points at a file that no longer exists.
fn needs_repair(icon: &str) -> bool {
    if icon.is_empty() {
        return false;
    }
    icon.to_ascii_lowercase().contains(r"\windows\installer\{") || !Path::new(icon).exists()
}

fn same_path(a: &str, b: &Path) -> bool {
    a.eq_ignore_ascii_case(&b.to_string_lossy())
}

fn from_wide(buf: &[u16]) -> String {
    let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..end])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn installer_cache_icons_need_repair() {
        assert!(needs_repair(
            r"C:\WINDOWS\Installer\{23AD8F25-5466-4062-B331-F653B84CA8A5}\ProductIcon"
        ));
    }

    #[test]
    fn existing_icons_and_empty_locations_are_left_alone() {
        assert!(!needs_repair(""));
        let me = std::env::current_exe().unwrap();
        assert!(!needs_repair(&me.to_string_lossy()));
    }

    #[test]
    fn missing_icon_files_need_repair() {
        assert!(needs_repair(r"C:\no\such\folder\apex.ico"));
    }

    /// Writes a real .lnk with an installer-cache icon, repairs it, reads it back.
    #[test]
    fn repairs_a_real_shortcut_and_leaves_others_alone() {
        let exe = std::env::current_exe().unwrap();
        let dir = std::env::temp_dir().join(format!("apex-pin-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let ours = dir.join("ours.lnk");
        let other = dir.join("other.lnk");
        let stale = r"C:\WINDOWS\Installer\{23AD8F25-5466-4062-B331-F653B84CA8A5}\ProductIcon";
        let notepad = Path::new(r"C:\Windows\System32\notepad.exe");

        unsafe {
            CoInitializeEx(None, COINIT_APARTMENTTHREADED).ok().unwrap();
            write_link(&ours, &exe, stale);
            write_link(&other, notepad, stale);

            assert!(repair_link(&ours, &exe).unwrap());
            assert!(!repair_link(&other, &exe).unwrap());
            assert!(same_path(&read_icon(&ours), &exe));
            assert_eq!(read_icon(&other), stale);
            // Already fixed: a second pass changes nothing.
            assert!(!repair_link(&ours, &exe).unwrap());
            CoUninitialize();
        }
        let _ = std::fs::remove_dir_all(&dir);
    }

    unsafe fn write_link(link: &Path, target: &Path, icon: &str) {
        let sl: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).unwrap();
        let t = HSTRING::from(target.as_os_str());
        let i = HSTRING::from(icon);
        sl.SetPath(PCWSTR(t.as_ptr())).unwrap();
        sl.SetIconLocation(PCWSTR(i.as_ptr()), 0).unwrap();
        let l = HSTRING::from(link.as_os_str());
        sl.cast::<IPersistFile>().unwrap().Save(PCWSTR(l.as_ptr()), true).unwrap();
    }

    unsafe fn read_icon(link: &Path) -> String {
        let sl: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).unwrap();
        let l = HSTRING::from(link.as_os_str());
        sl.cast::<IPersistFile>().unwrap().Load(PCWSTR(l.as_ptr()), STGM_READWRITE).unwrap();
        let mut icon = [0u16; 260];
        let mut index = 0;
        sl.GetIconLocation(&mut icon, &mut index).unwrap();
        from_wide(&icon)
    }
}
