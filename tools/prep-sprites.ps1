# 角色贴图预处理：去白底 -> 按内容裁边 -> 缩放 -> 降色深 -> PNG-8
#
# 用法（注意 -ExecutionPolicy Bypass）：
#   powershell -ExecutionPolicy Bypass -File tools/prep-sprites.ps1
#   powershell -ExecutionPolicy Bypass -File tools/prep-sprites.ps1 -Version v4
#
# 为什么用 PowerShell + C#：仓库零依赖，Node 没有内置 JPEG 解码器。
# 为什么每张图开子进程：同进程连续处理多张会触发 GDI+ "Parameter is not valid"。
#
# 输出文件名带版本号（chiikawa.v3.png），配合 _headers 的 immutable 缓存：
# 换图时改 -Version，URL 变化后浏览器必然重新拉取。
param(
  [string]$SourceDir = 'C:\DESKTOP\哈气猫',
  [int]$Size = 192,
  [double]$PadRatio = 0.06,
  [int]$Tolerance = 40,
  [int]$PosterizeBits = 5,
  [int]$PaletteColors = 256,
  [string]$Version = 'v3',
  [string]$Only = ''
)

$ErrorActionPreference = 'Stop'
$tools = $PSScriptRoot
$root = Split-Path -Parent $tools
$dst = Join-Path $root 'assets\chars'

$pairs = @(
  @{ n = '小八.jpg';   h = '小八受击.jpg';   out = 'hachiware' },
  @{ n = '吉伊.jpg';   h = '吉伊受击.jpg';   out = 'chiikawa' },
  @{ n = '乌萨奇.jpg'; h = '乌萨奇受击.jpg'; out = 'usagi' }
)

if ($Only -eq '') {
  New-Item -ItemType Directory -Path $dst -Force | Out-Null
  foreach ($p in $pairs) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -SourceDir $SourceDir -Size $Size -PadRatio $PadRatio -Tolerance $Tolerance -PosterizeBits $PosterizeBits -PaletteColors $PaletteColors -Version $Version -Only $p.out
    if ($LASTEXITCODE -ne 0) { Write-Warning "$($p.out) 处理失败" }
  }
  $keep = "\.$Version(-hit)?\.png$"
  Get-ChildItem $dst -Filter *.png | Where-Object { $_.Name -notmatch $keep } | ForEach-Object {
    Write-Host "  清理: $($_.Name)"
    Remove-Item $_.FullName -Force
  }
  $files = Get-ChildItem $dst -Filter *.png
  $total = ($files | Measure-Object Length -Sum).Sum
  Write-Host ("合计 {0} KB，共 {1} 个文件" -f [Math]::Round($total / 1KB, 1), $files.Count)
  exit 0
}

Add-Type -Path (Join-Path $tools 'sprite-prep.cs') -ReferencedAssemblies System.Drawing,System.Drawing.Primitives
if ($PosterizeBits -gt 0) { Add-Type -Path (Join-Path $tools 'posterize.cs') -ReferencedAssemblies System.Drawing,System.Drawing.Primitives }
Add-Type -Path (Join-Path $tools 'png8.cs') -ReferencedAssemblies System.Drawing,System.Drawing.Primitives

$pair = $pairs | Where-Object { $_.out -eq $Only } | Select-Object -First 1
if (-not $pair) { Write-Warning "未知角色: $Only"; exit 1 }

$sn = Join-Path $SourceDir $pair.n
$sh = Join-Path $SourceDir $pair.h
if (-not (Test-Path $sn) -or -not (Test-Path $sh)) { Write-Warning "缺少文件: $($pair.n)"; exit 1 }

$tmpN = Join-Path $dst "_tmp-n.png"
$tmpH = Join-Path $dst "_tmp-h.png"
$outN = Join-Path $dst ("{0}.{1}.png" -f $pair.out, $Version)
$outH = Join-Path $dst ("{0}-hit.{1}.png" -f $pair.out, $Version)

$r = ([SpritePrep]::Process($sn, $sh, $tmpN, $tmpH, $Size, $PadRatio, $Tolerance)) -split '\|'
if ($r[0] -eq 'ERR') { Write-Warning "处理失败: $($r[1])"; exit 1 }

if ($PosterizeBits -gt 0) {
  [Posterize]::Run($tmpN, $PosterizeBits, 8) | Out-Null
  [Posterize]::Run($tmpH, $PosterizeBits, 8) | Out-Null
}

[Png8]::Encode($tmpN, $outN, $PaletteColors) | Out-Null
[Png8]::Encode($tmpH, $outH, $PaletteColors) | Out-Null
Remove-Item $tmpN, $tmpH -Force

$sz = (Get-Item $outN).Length + (Get-Item $outH).Length
Write-Host ("  {0}: {1}x{2} 内容框，{3} KB" -f $pair.out, $r[2], $r[3], [Math]::Round($sz / 1KB, 1))