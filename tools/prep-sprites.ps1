# 角色贴图预处理：去白底 -> 按内容裁边 -> 缩放 -> 降色深压缩
#
# 用法（注意 -ExecutionPolicy Bypass，否则脚本会被执行策略拦下）：
#   powershell -ExecutionPolicy Bypass -File tools/prep-sprites.ps1
#   powershell -ExecutionPolicy Bypass -File tools/prep-sprites.ps1 -SourceDir 'C:\DESKTOP\哈气猫'
#
# 为什么是 PowerShell + C#：仓库零依赖，Node 没有内置 JPEG 解码器。
# 这里借 .NET 的 System.Drawing（Windows 自带）。
# 为什么每张图开子进程：同一进程里连续处理多张会触发 GDI+ 的
# "Parameter is not valid"，隔离子进程最省事也最稳。
param(
  [string]$SourceDir = 'C:\DESKTOP\哈气猫',
  [int]$Size = 256,
  [double]$PadRatio = 0.06,
  [int]$Tolerance = 40,
  [int]$PosterizeBits = 5,   # 0 = 不降色深；5 = 每通道 32 级，平涂图几乎无感
  [string]$Only = ''         # 内部用：只处理某一个角色
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
  # 主进程：逐个角色拉起子进程
  New-Item -ItemType Directory -Path $dst -Force | Out-Null
  $total = 0
  foreach ($p in $pairs) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath `
      -SourceDir $SourceDir -Size $Size -PadRatio $PadRatio `
      -Tolerance $Tolerance -PosterizeBits $PosterizeBits -Only $p.out
    if ($LASTEXITCODE -ne 0) { Write-Warning "$($p.out) 处理失败" }
  }
  foreach ($f in (Get-ChildItem $dst -Filter *.png)) { $total += $f.Length }
  Write-Host ("合计 {0} KB，输出目录 {1}" -f [Math]::Round($total / 1KB, 1), $dst)
  exit 0
}

Add-Type -Path (Join-Path $tools 'sprite-prep.cs') -ReferencedAssemblies System.Drawing,System.Drawing.Primitives
if ($PosterizeBits -gt 0) {
  Add-Type -Path (Join-Path $tools 'posterize.cs') -ReferencedAssemblies System.Drawing,System.Drawing.Primitives
}

$pair = $pairs | Where-Object { $_.out -eq $Only } | Select-Object -First 1
if (-not $pair) { Write-Warning "未知角色: $Only"; exit 1 }

$sn = Join-Path $SourceDir $pair.n
$sh = Join-Path $SourceDir $pair.h
if (-not (Test-Path $sn) -or -not (Test-Path $sh)) { Write-Warning "缺少文件: $($pair.n)"; exit 1 }

$dn = Join-Path $dst ($pair.out + '.png')
$dh = Join-Path $dst ($pair.out + '-hit.png')

$r = ([SpritePrep]::Process($sn, $sh, $dn, $dh, $Size, $PadRatio, $Tolerance)) -split '\|'
if ($r[0] -eq 'ERR') { Write-Warning "处理失败: $($r[1])"; exit 1 }

if ($PosterizeBits -gt 0) {
  [Posterize]::Run($dn, $PosterizeBits, 8) | Out-Null
  [Posterize]::Run($dh, $PosterizeBits, 8) | Out-Null
}

$size = (Get-Item $dn).Length + (Get-Item $dh).Length
Write-Host ("  {0}: 去背 {1}% / {2}%，内容框 {3}x{4}，{5} KB" -f $pair.out, $r[0], $r[1], $r[2], $r[3], [Math]::Round($size / 1KB, 1))