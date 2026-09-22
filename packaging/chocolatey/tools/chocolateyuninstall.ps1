$ErrorActionPreference = 'Stop'

$keys = @(Get-UninstallRegistryKey -SoftwareName 'Apex Download Manager*' |
  Where-Object { $_.UninstallString -match 'msiexec' })

if ($keys.Count -eq 0) {
  Write-Warning "Apex Download Manager is not installed through its MSI; nothing to uninstall."
  return
}

foreach ($key in $keys) {
  Uninstall-ChocolateyPackage `
    -PackageName $env:ChocolateyPackageName `
    -FileType 'msi' `
    -SilentArgs "$($key.PSChildName) /qn /norestart" `
    -ValidExitCodes @(0, 3010, 1605, 1614, 1641)
}
