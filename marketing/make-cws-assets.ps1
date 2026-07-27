Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$root = "C:\CODE\VSCode\apex-download-manager"
$outDir = "$root\marketing\store-screenshots\cws"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# Chrome requires 24-bit PNG with no alpha channel for screenshots and promo
# tiles. The sources are fully opaque already, so this is a format change, not
# a visual one: draw onto a 24bpp surface over black so any stray edge pixel
# lands on the brand background rather than white.
function ConvertTo-Png24($srcPath, $dstPath) {
    $src = New-Object System.Drawing.Bitmap($srcPath)
    $dst = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.Clear([System.Drawing.Color]::Black)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
    $g.Dispose()
    $dst.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $w = $dst.Width; $h = $dst.Height; $fmt = $dst.PixelFormat
    $dst.Dispose(); $src.Dispose()
    "  {0,-34} {1}x{2} {3}" -f (Split-Path $dstPath -Leaf), $w, $h, $fmt
}

Write-Host "Screenshots (24-bit, no alpha):"
# The app-window shot is intentionally absent: it shows the "Grab Video"
# toolbar button, and the Chrome package strips that feature. See the README
# in the output folder.
$shots = @(
    @("edge-popup-1280x800.png",          "01-popup-1280x800.png"),
    @("edge-capture-prompt-1280x800.png", "02-capture-prompt-1280x800.png")
)
foreach ($s in $shots) {
    ConvertTo-Png24 "$root\marketing\store-screenshots\$($s[0])" "$outDir\$($s[1])"
}

# Store icon: Chrome's guidance is 128x128 canvas with the artwork occupying
# roughly 96x96, transparent padding around it. The extension icon fills the
# whole canvas, which looks oversized next to other listings, so emit a padded
# variant alongside it and let the human pick.
Write-Host "`nStore icon:"
$srcIcon = New-Object System.Drawing.Bitmap("$root\browser-extension\icons\128.png")
$icon = New-Object System.Drawing.Bitmap(128, 128, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($icon)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($srcIcon, 16, 16, 96, 96)
$g.Dispose()
$iconPath = "$root\marketing\cws-store-icon-128.png"
$icon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose(); $srcIcon.Dispose()
"  {0,-34} 128x128, artwork 96x96 centered" -f (Split-Path $iconPath -Leaf)

Write-Host "`nVerifying no alpha in screenshots:"
foreach ($f in (Get-ChildItem $outDir -Filter *.png)) {
    $img = [System.Drawing.Image]::FromFile($f.FullName)
    $alpha = [System.Drawing.Image]::IsAlphaPixelFormat($img.PixelFormat)
    "  {0,-34} {1}x{2} alpha={3} {4:N0} bytes" -f $f.Name, $img.Width, $img.Height, $alpha, $f.Length
    $img.Dispose()
    if ($alpha) { throw "$($f.Name) still has an alpha channel" }
}
