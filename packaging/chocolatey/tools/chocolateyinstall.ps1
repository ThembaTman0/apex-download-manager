$ErrorActionPreference = 'Stop'

# url64bit and checksum64 are rewritten by the release workflow for each version.
$packageArgs = @{
  packageName    = $env:ChocolateyPackageName
  fileType       = 'msi'
  url64bit       = 'https://github.com/ThembaTman0/apex-download-manager-releases/releases/download/v1.0.9/Apex.Download.Manager_1.0.9_x64_en-US.msi'
  checksum64     = 'b31face3bbd9774cfed03e6f0d4719f9b27d3a9af1c9041713b9942ebba8f71d'
  checksumType64 = 'sha256'
  softwareName   = 'Apex Download Manager*'
  silentArgs     = "/qn /norestart /l*v `"$($env:TEMP)\$($env:ChocolateyPackageName).$($env:ChocolateyPackageVersion).MsiInstall.log`""
  validExitCodes = @(0, 3010, 1641)
}

Install-ChocolateyPackage @packageArgs
