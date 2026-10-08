Progress bars stay full while a playlist downloads, and downloads from more sites now start first time.

**Fixes**

- Progress bars no longer shrink while a playlist downloads. With several downloads running, finished rows could show a short or empty bar next to "100%". Every bar now shows its real progress, however busy the list gets.
- Downloads from more sites work first time. Some sites use newer security certificates that Windows only fetches the first time a browser needs them, so Apex could fail with "connection failed" on a link that downloaded fine in the browser. Apex now carries its own up-to-date list of trusted certificate authorities alongside the Windows one, so these sites work straight away. Networks that inspect secure traffic, such as company or antivirus proxies, keep working as before.
