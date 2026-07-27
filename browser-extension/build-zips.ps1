# Builds the extension zips from this folder. Run it after any change here:
#
#   powershell -File browser-extension\build-zips.ps1
#
# Three flavors, all from the same source:
#
#   browser-extension.zip          Firefox / AMO. Manifest as-is.
#   browser-extension-chromium.zip Edge Add-ons. No browser_specific_settings,
#                                  background.service_worker only (Edge hard
#                                  rejects background.scripts in MV3).
#   browser-extension-chrome.zip   Chrome Web Store. Same as the Edge flavor,
#                                  plus the video-grab feature stripped and
#                                  activeTab dropped. CWS forbids extensions
#                                  that facilitate downloading streaming media,
#                                  and enforces it against YouTube grabbers.
#
# The grab feature is delimited in the sources by "#grab-begin"/"#grab-end"
# markers so the Chrome flavor is a build-time strip, not a code fork. Keep the
# markers balanced when editing that code.
#
# Two things this script exists to get right, both of which have broken a
# submission before:
#   - Zip entry names use forward slashes. AMO's validator rejects backslashes
#     ("Invalid file name in archive"); Compress-Archive writes them.
#   - Files are read as UTF-8 explicitly. Get-Content plus ConvertTo-Json
#     mangles non-ASCII characters in the manifest description.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$src = $PSScriptRoot
$repo = Split-Path $src -Parent

# Payload only. The markdown in this folder is documentation and must never
# be packaged.
$files = @(
    "manifest.json",
    "bg.js",
    "popup.html",
    "popup.js",
    "icons/16.png",
    "icons/32.png",
    "icons/48.png",
    "icons/128.png"
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Text($relative) {
    [System.IO.File]::ReadAllText((Join-Path $src $relative), [System.Text.Encoding]::UTF8)
}

# Drops every #grab-begin .. #grab-end region, inclusive of the markers.
# Works for both // and <!-- --> comment styles because it matches on the
# marker text and takes the whole lines it sits on.
function Remove-GrabRegions($text) {
    $lines = $text -split "`r?`n"
    $out = New-Object System.Collections.Generic.List[string]
    $depth = 0
    foreach ($line in $lines) {
        if ($line -match "#grab-begin") { $depth++; continue }
        if ($line -match "#grab-end") {
            $depth--
            if ($depth -lt 0) { throw "Unbalanced #grab-end marker" }
            continue
        }
        if ($depth -eq 0) { $out.Add($line) }
    }
    if ($depth -ne 0) { throw "Unbalanced #grab-begin marker: $depth region(s) left open" }
    ($out -join "`n")
}

# The manifest is edited as text, not parsed and re-serialized, so key order
# and formatting stay byte-stable between flavors.
function Get-Manifest($flavor) {
    $m = Read-Text "manifest.json"
    if ($flavor -eq "firefox") { return $m }

    # Chromium flavors: service_worker only, no gecko block.
    $m = $m -replace '(?s)\s*"background":\s*\{.*?\},', @"

  "background": {
    "service_worker": "bg.js"
  },
"@
    $m = $m -replace '(?s),\s*"browser_specific_settings":\s*\{.*?\n  \}', ''

    if ($flavor -eq "chrome") {
        $m = $m -replace ',\s*"activeTab"', ''
    }
    return $m
}

function New-Zip($name, $flavor) {
    $zipPath = Join-Path $repo $name
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

    $stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
    $zip = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($f in $files) {
            # Entry name is set explicitly with forward slashes. This is the
            # whole reason the script exists.
            $entry = $zip.CreateEntry($f, [System.IO.Compression.CompressionLevel]::Optimal)
            $es = $entry.Open()
            try {
                if ($f -eq "manifest.json") {
                    $bytes = $utf8NoBom.GetBytes((Get-Manifest $flavor))
                } elseif ($flavor -eq "chrome" -and ($f -eq "bg.js" -or $f -eq "popup.js" -or $f -eq "popup.html")) {
                    $bytes = $utf8NoBom.GetBytes((Remove-GrabRegions (Read-Text $f)))
                } else {
                    $bytes = [System.IO.File]::ReadAllBytes((Join-Path $src $f))
                }
                $es.Write($bytes, 0, $bytes.Length)
            } finally { $es.Dispose() }
        }
    } finally {
        $zip.Dispose()
        $stream.Dispose()
    }

    $size = (Get-Item $zipPath).Length
    Write-Host ("  {0,-32} {1,7:N0} bytes" -f $name, $size)
}

$version = ([regex]::Match((Read-Text "manifest.json"), '"version":\s*"([^"]+)"')).Groups[1].Value
Write-Host "Building extension zips, version $version"
New-Zip "browser-extension.zip" "firefox"
New-Zip "browser-extension-chromium.zip" "chromium"
New-Zip "browser-extension-chrome.zip" "chrome"

# Verify what was produced rather than trusting it.
Write-Host "`nVerifying:"
foreach ($name in @("browser-extension.zip", "browser-extension-chromium.zip", "browser-extension-chrome.zip")) {
    $zipPath = Join-Path $repo $name
    $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        $names = $archive.Entries | ForEach-Object { $_.FullName }
        $bad = $names | Where-Object { $_ -like "*\*" }
        if ($bad) { throw "$name has backslash entry names: $($bad -join ', ')" }
        if ($names.Count -ne $files.Count) {
            throw "$name has $($names.Count) entries, expected $($files.Count)"
        }

        $entry = $archive.GetEntry("manifest.json")
        $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
        $manifest = $reader.ReadToEnd()
        $reader.Dispose()
        $null = $manifest | ConvertFrom-Json   # throws if the edit broke the JSON

        $entry = $archive.GetEntry("bg.js")
        $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
        $bg = $reader.ReadToEnd()
        $reader.Dispose()

        $flags = @()
        if ($manifest -match '"activeTab"') { $flags += "activeTab" }
        if ($manifest -match "browser_specific_settings") { $flags += "gecko" }
        if ($manifest -match '"scripts"') { $flags += "background.scripts" }
        if ($bg -match "apex-grab-page") { $flags += "grab" }
        if ($manifest -match "#grab") { $flags += "LEFTOVER-MARKER" }
        Write-Host ("  {0,-32} ok, {1} entries [{2}]" -f $name, $names.Count, ($(if ($flags) { $flags -join ", " } else { "none" })))
    } finally { $archive.Dispose() }
}
Write-Host "`nExpected flags: firefox [gecko, background.scripts, activeTab, grab], chromium [activeTab, grab], chrome [none]"
