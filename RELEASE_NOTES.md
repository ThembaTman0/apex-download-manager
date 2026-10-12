Your pinned Apex icon on the taskbar now survives updates.

**Fixes**

- The taskbar icon no longer breaks after an update. If you installed Apex with the MSI installer (including through winget or Chocolatey) and pinned it to the taskbar, each update could leave the pin with a blank or generic icon. The installer now gives the shortcut an icon that stays put, and Apex repairs a pin that an earlier update already broke the first time it starts. Only Apex's own shortcuts are touched.
