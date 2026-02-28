Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(128, 128)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'

# Background
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#0a0a0f'))
$g.FillRectangle($bgBrush, 0, 0, 128, 128)

# Rounded rect background
$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#1a1a2e'))
$rectPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$rectPath.AddArc(8, 8, 20, 20, 180, 90)
$rectPath.AddArc(100, 8, 20, 20, 270, 90)
$rectPath.AddArc(100, 100, 20, 20, 0, 90)
$rectPath.AddArc(8, 100, 20, 20, 90, 90)
$rectPath.CloseFigure()
$g.FillPath($accentBrush, $rectPath)

# Lock arch
$lockPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#22c55e'), 4)
$g.DrawArc($lockPen, 42, 28, 44, 40, 180, 180)

# Lock body
$lockBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#22c55e'))
$lockBody = New-Object System.Drawing.Drawing2D.GraphicsPath
$lockBody.AddArc(34, 56, 10, 10, 180, 90)
$lockBody.AddArc(84, 56, 10, 10, 270, 90)
$lockBody.AddArc(84, 86, 10, 10, 0, 90)
$lockBody.AddArc(34, 86, 10, 10, 90, 90)
$lockBody.CloseFigure()
$g.FillPath($lockBrush, $lockBody)

# Keyhole
$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#0a0a0f'))
$g.FillEllipse($darkBrush, 58, 66, 12, 12)
$g.FillRectangle($darkBrush, 61, 74, 6, 10)

$outPath = Join-Path $PSScriptRoot '..\resources\lockbox-marketplace-icon.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "PNG icon created at $outPath"
