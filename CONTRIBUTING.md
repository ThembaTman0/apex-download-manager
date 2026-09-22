# Contributing to Apex Download Manager

Thanks for helping out. Bug reports, fixes and features are all welcome.

- **Found a bug?** [Open an issue](https://github.com/ThembaTman0/apex-download-manager/issues/new)
  with the Apex version (shown in the status bar), what you did, and what
  happened. A download URL that reproduces it helps a lot.
- **Found a security problem?** Don't open an issue. See [SECURITY.md](SECURITY.md).
- **Planning something big?** Open an issue first so we can agree on the
  approach before you spend time on it.

## Repository layout

| Folder | What it is |
|---|---|
| `desktop-ui/` | The app: Tauri v2, React + TypeScript frontend in `src/`, Rust engine in `src-tauri/` |
| `browser-extension/` | Chrome/Edge/Firefox extension. Plain JavaScript, no bundler |
| `website/` | The landing page (Vite + React) and its serverless API |

## Setting up

You need Windows, [Rust](https://rustup.rs) (stable, MSVC toolchain),
[Node.js](https://nodejs.org) 20 or newer, and the Visual Studio Build Tools
(C++ workload and Windows SDK).

```powershell
cd desktop-ui
npm install
npm run tauri dev      # the full app, with hot reload
npm run dev            # UI only, in a browser, with a simulated backend
```

`npm run dev` needs no Rust at all: `src/demo/tauriMock.ts` fakes the backend,
so most UI work can be done in a browser.

The extension has no build step. Load `browser-extension/` unpacked
(`chrome://extensions` with Developer mode on, or `about:debugging` in
Firefox), then pair it from Apex Settings.

## Before you open a pull request

There is no linter. These are the checks, and they must pass:

```powershell
cd desktop-ui
npm run build                 # TypeScript typecheck + frontend build
cd src-tauri
cargo check
cargo test --lib              # Rust unit tests
```

If you changed the website, run `npm run build` in `website/` too.

Rust unit tests live next to the code in `#[cfg(test)]` modules. Add one when
you change engine logic, settings or anything else that can be tested
without a network.

## Things that are easy to miss

- **New Tauri commands** need three things: the handler in `commands.rs`,
  registration in `generate_handler![]` in `lib.rs`, and a wrapper in
  `src/services/backend.ts` (the only place `invoke()` is called). Add a case
  to `src/demo/tauriMock.ts` too, or `npm run dev` breaks.
- **Settings fields** are stored as JSON. A new field needs a sensible
  default, and must not change behaviour for people whose saved settings
  predate it.
- **Extension changes**: the store packages are built from the folder with
  `powershell -File browser-extension\build-zips.ps1`. The Chrome build strips
  the video-grab feature, which is fenced by `#grab-begin` / `#grab-end`
  markers; keep them balanced.
- **Wording**: user-facing text (UI, notifications, errors, release notes)
  uses plain hyphens or commas, never em dashes.

## Project rules

These are deliberate and a pull request that breaks them won't be merged:

- **Local only.** No accounts, no telemetry, no analytics, no calls home.
- **The capture server** stays bound to `127.0.0.1` and token-gated.
- **The extension** requests no access to page content.
- **Downloaded files** keep their Mark of the Web, so SmartScreen and
  Defender still scan them.

## Pull requests

Fork the repository, make your change on a branch, and open a pull request
against `main`. Keep each pull request to one change, and say in the
description how you tested it. Commit messages follow the style already in
the history, for example `fix(engine): ...` or `feat(ui): ...`.

Releases are cut by the maintainer; you don't need to bump version numbers.

## License

Apex is licensed under the [GNU General Public License v3.0 or later](LICENSE).
By submitting a contribution, you agree that it is licensed under the same
terms.
