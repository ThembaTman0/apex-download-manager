# Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io),
certificate by [SignPath Foundation](https://signpath.org).

**Status:** the project has applied to the SignPath Foundation. Signing
begins with the first release after the application is approved; releases
before that are unsigned.

## What is signed

The Windows installers (NSIS `setup.exe` and `.msi`) and the application
executable inside them, as published on the
[releases page](https://github.com/ThembaTman0/apex-download-manager-releases/releases).
Every signed file is built by GitHub Actions
([`release.yml`](.github/workflows/release.yml)) from a tagged commit in this
repository, and each signing request is approved by hand.

Not signed by this certificate: the browser extension (signed by the Chrome,
Edge and Firefox stores) and the optional yt-dlp and FFmpeg tools, which the
app downloads from the yt-dlp project's GitHub releases only when you ask it
to.

## Team roles

| Role | Members |
|---|---|
| Committers and reviewers | [ThembaTman0](https://github.com/ThembaTman0) |
| Approvers | [ThembaTman0](https://github.com/ThembaTman0) |

Changes from anyone outside this list are reviewed by a committer before they
are merged.

## Privacy

Apex has no accounts and no telemetry. It does not send information about you
or your downloads to the project or to anyone else. Its network traffic is:

- the downloads you start, which go directly to the sites you download from;
- the update check, which fetches the latest version number from GitHub
  (see [GitHub's privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement));
- the optional video tools, downloaded on request from the
  [yt-dlp](https://github.com/yt-dlp/yt-dlp) project's GitHub releases.

The full privacy policy is at
<https://apex-download-manager.vercel.app/privacy.html>.
