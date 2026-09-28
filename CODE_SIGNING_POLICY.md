# Code signing and how to verify a download

**Apex installers are not code-signed yet.** Windows will show a "Windows
protected your PC" prompt the first time you run one: click **More info**,
then **Run anyway**, or verify the file first as described below.

Certificates that Windows trusts cost money or require a sponsor. Apex
applied to the SignPath Foundation's free programme for open-source projects
in September 2026 and was declined for now: the programme asks for a level of
public visibility the project has not reached yet. Reapplying is planned. In
the meantime, everything needed to check a download yourself is published.

## How to check that a download is genuine

1. Download the installer only from <https://apexdownloadmanager.com/> or from
   the [releases page](https://github.com/ThembaTman0/apex-download-manager-releases/releases).
2. Compare its SHA-256 with the one shown on the website's download section
   (it is read live from the published release):

   ```powershell
   Get-FileHash .\Apex.Download.Manager_1.0.9_x64-setup.exe -Algorithm SHA256
   ```

3. Every installer is built by GitHub Actions
   ([`release.yml`](.github/workflows/release.yml)) from a tagged commit in
   this repository, so the build is reproducible from public source.

Updates inside the app are separately signed with the project's own updater
key: the app refuses any update whose signature does not match the public key
built into it. That protects updates even though the installer is unsigned.

## What is published

- The full source, under GPL-3.0-or-later.
- The SHA-256 of each installer, on the website and in the release assets.
- The build workflow that produced them.

## Privacy

Apex has no accounts and no telemetry. It does not send information about you
or your downloads to the project or to anyone else. Its network traffic is:

- the downloads you start, which go directly to the sites you download from;
- the update check, which fetches the latest version number from GitHub
  (see [GitHub's privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement));
- the optional video tools, downloaded on request from the
  [yt-dlp](https://github.com/yt-dlp/yt-dlp) project's GitHub releases.

The full privacy policy is at <https://apexdownloadmanager.com/privacy.html>.
