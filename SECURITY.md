# Security Policy

## Reporting a vulnerability

Please report security issues privately, not in a public issue.

Use GitHub's private reporting:
[**Report a vulnerability**](https://github.com/ThembaTman0/apex-download-manager/security/advisories/new).
It opens a private thread that only you and the maintainer can see. If you
can't use GitHub, email **thembatman0@gmail.com** with "Apex security" in the
subject instead. Include:

- what the issue is and what an attacker could do with it
- steps to reproduce, or a proof of concept
- the Apex version (shown in the status bar and in Settings) and, for
  extension issues, the browser and extension version

Apex is maintained by one person, so replies may take a few days. Please give
a reasonable amount of time for a fix to ship before disclosing publicly.

## Supported versions

Only the latest release receives fixes. The app updates itself, so a fix
reaches users through the normal update prompt.

## What is in scope

Areas where a report is especially welcome:

- **The capture server.** The app listens on `127.0.0.1:43666` for the browser
  extension. It must stay loopback-only and reject requests without the
  pairing token, and web pages must not be able to reach or probe it.
- **The browser extension.** It requests no access to page content. Anything
  that lets a website read or influence what it sends to Apex is in scope.
- **Downloads and files.** Path traversal or unsafe file names, writing outside
  the chosen folder, or a completed file missing its Mark-of-the-Web.
- **Updates.** Anything that could get an update installed without a valid
  signature from the Apex updater key.
- **Cookies and credentials.** Browser cookies handed to Apex for a download
  must not leak to another site or persist after the download finishes.

Out of scope: problems in the sites you download from, and issues that need an
attacker who already controls your Windows account.
