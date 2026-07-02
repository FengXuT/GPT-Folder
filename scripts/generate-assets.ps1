$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$iconsDir = Join-Path $root "public\icons"
$storeDir = Join-Path $root "store-assets"
New-Item -ItemType Directory -Force $iconsDir | Out-Null
New-Item -ItemType Directory -Force $storeDir | Out-Null

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

function New-Canvas {
  param(
    [int]$Width,
    [int]$Height
  )

  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
  $bitmap.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  return @($bitmap, $graphics)
}

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Save-Png {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Draw-FolderIcon {
  param(
    [int]$Size,
    [string]$Path
  )

  $canvas = New-Canvas $Size $Size
  $bitmap = $canvas[0]
  $graphics = $canvas[1]
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $scale = $Size / 128
  $blue = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
  $cyan = [System.Drawing.Color]::FromArgb(255, 14, 165, 233)
  $ink = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
  $shadow = [System.Drawing.Color]::FromArgb(45, 15, 23, 42)

  $shadowBrush = New-Object System.Drawing.SolidBrush $shadow
  $bodyBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.RectangleF (20 * $scale), (30 * $scale), (88 * $scale), (72 * $scale)),
    $blue,
    $cyan,
    45
  )
  $inkPen = New-Object System.Drawing.Pen $ink, (7 * $scale)
  $inkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $inkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $inkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $shadowPath = New-RoundedRectanglePath (19 * $scale) (36 * $scale) (92 * $scale) (70 * $scale) (19 * $scale)
  $folderPath = New-RoundedRectanglePath (18 * $scale) (30 * $scale) (92 * $scale) (70 * $scale) (18 * $scale)
  $tabPath = New-RoundedRectanglePath (18 * $scale) (24 * $scale) (50 * $scale) (32 * $scale) (14 * $scale)

  $graphics.FillPath($shadowBrush, $shadowPath)
  $graphics.FillPath($bodyBrush, $tabPath)
  $graphics.FillPath($bodyBrush, $folderPath)

  $graphics.DrawLine($inkPen, (53 * $scale), (54 * $scale), (80 * $scale), (54 * $scale))
  $graphics.DrawLine($inkPen, (53 * $scale), (70 * $scale), (91 * $scale), (70 * $scale))
  $graphics.DrawLine($inkPen, (53 * $scale), (86 * $scale), (73 * $scale), (86 * $scale))

  Save-Png $bitmap $Path

  $graphics.Dispose()
  $bitmap.Dispose()
}

foreach ($size in @(16, 32, 48, 128)) {
  Draw-FolderIcon $size (Join-Path $iconsDir "icon-$size.png")
}

$promoCanvas = New-Canvas 440 280
$promoBitmap = $promoCanvas[0]
$promoGraphics = $promoCanvas[1]
$promoGraphics.Clear([System.Drawing.Color]::FromArgb(255, 246, 248, 251))

$promoBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle 0, 0, 440, 280),
  [System.Drawing.Color]::FromArgb(255, 239, 246, 255),
  [System.Drawing.Color]::FromArgb(255, 236, 253, 245),
  25
)
$promoGraphics.FillRectangle($promoBg, 0, 0, 440, 280)
$cardBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 226, 232, 240)), 1
$inkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
$mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 100, 116, 139))
$blueBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$fontTitle = New-Object System.Drawing.Font "Segoe UI", 26, ([System.Drawing.FontStyle]::Bold)
$fontBody = New-Object System.Drawing.Font "Segoe UI", 13, ([System.Drawing.FontStyle]::Regular)
$fontSmall = New-Object System.Drawing.Font "Segoe UI", 10, ([System.Drawing.FontStyle]::Regular)
$promoGraphics.DrawString("ChatGPT Folders", $fontTitle, $inkBrush, 34, 34)
$promoGraphics.DrawString("Organize ChatGPT conversations into synced folders.", $fontBody, $mutedBrush, 36, 76)
$sidebarPath = New-RoundedRectanglePath 36 116 158 116 14
$promoGraphics.FillPath($cardBrush, $sidebarPath)
$promoGraphics.DrawPath($linePen, $sidebarPath)
$promoGraphics.DrawString("Folders", $fontBody, $inkBrush, 54, 134)
$promoGraphics.FillRectangle($blueBrush, 56, 165, 16, 13)
$promoGraphics.DrawString("Study", $fontSmall, $inkBrush, 82, 158)
$promoGraphics.DrawString("Physics review", $fontSmall, $mutedBrush, 82, 184)
$promoGraphics.DrawString("Algorithms", $fontSmall, $mutedBrush, 82, 205)
$chatPath = New-RoundedRectanglePath 214 116 188 116 14
$promoGraphics.FillPath($cardBrush, $chatPath)
$promoGraphics.DrawPath($linePen, $chatPath)
$promoGraphics.DrawString("Current chat", $fontBody, $inkBrush, 232, 136)
$promoGraphics.DrawString("Add to folder", $fontSmall, $mutedBrush, 232, 166)
$promoGraphics.DrawString("No messages are collected.", $fontSmall, $mutedBrush, 232, 192)
Save-Png $promoBitmap (Join-Path $storeDir "small-promo-440x280.png")
$promoGraphics.Dispose()
$promoBitmap.Dispose()

$shotCanvas = New-Canvas 1280 800
$shotBitmap = $shotCanvas[0]
$shotGraphics = $shotCanvas[1]
$shotGraphics.Clear([System.Drawing.Color]::FromArgb(255, 250, 250, 250))
$sidebarBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 247, 247, 248))
$rowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 236, 236, 237))
$lightBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 242, 247, 255))
$shotGraphics.FillRectangle($sidebarBrush, 0, 0, 286, 800)
$shotGraphics.DrawLine($linePen, 286, 0, 286, 800)
$fontLogo = New-Object System.Drawing.Font "Segoe UI", 20, ([System.Drawing.FontStyle]::Bold)
$fontUi = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Regular)
$fontUiBold = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Bold)
$shotGraphics.DrawString("ChatGPT", $fontLogo, $inkBrush, 28, 26)
$shotGraphics.DrawString("New chat", $fontUi, $inkBrush, 32, 92)
$shotGraphics.DrawString("Search chats", $fontUi, $inkBrush, 32, 134)
$shotGraphics.DrawString("Library", $fontUi, $inkBrush, 32, 176)
$shotGraphics.DrawString("Folders", $fontUi, $inkBrush, 22, 272)
$folderRow = New-RoundedRectanglePath 10 306 262 38 10
$shotGraphics.FillPath($rowBrush, $folderRow)
$shotGraphics.DrawString("Study", $fontUiBold, $inkBrush, 52, 313)
$shotGraphics.DrawString("Physics review", $fontUi, $mutedBrush, 68, 358)
$shotGraphics.DrawString("Algorithms summary", $fontUi, $mutedBrush, 68, 396)
$shotGraphics.DrawString("Recent", $fontUiBold, $inkBrush, 24, 452)
$shotGraphics.DrawString("Three-state gate MUX notes", $fontUi, $inkBrush, 28, 494)
$shotGraphics.DrawString("DRAM alternative frequency", $fontUi, $inkBrush, 28, 536)
$shotGraphics.FillRectangle($lightBrush, 286, 0, 994, 800)
$fontHero = New-Object System.Drawing.Font "Segoe UI", 28, ([System.Drawing.FontStyle]::Regular)
$shotGraphics.DrawString("ChatGPT conversations, organized", $fontHero, $inkBrush, 420, 292)
$inputPath = New-RoundedRectanglePath 420 374 620 58 28
$shotGraphics.FillPath($cardBrush, $inputPath)
$shotGraphics.DrawPath($linePen, $inputPath)
$shotGraphics.DrawString("Ask anything", $fontUi, $mutedBrush, 470, 391)
Save-Png $shotBitmap (Join-Path $storeDir "screenshot-1280x800.png")
$shotGraphics.Dispose()
$shotBitmap.Dispose()

Write-Host "Generated extension icons and store assets."
