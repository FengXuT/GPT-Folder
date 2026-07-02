$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$release = Join-Path $root "release"
$zip = Join-Path $release "chatgpt-folders-extension-store.zip"
$downloadZip = Join-Path $release "chatgpt-folders-extension.zip"

Push-Location $root
try {
  npm.cmd run build

  if (!(Test-Path (Join-Path $dist "manifest.json"))) {
    throw "dist\manifest.json was not generated."
  }

  New-Item -ItemType Directory -Force $release | Out-Null
  if (Test-Path $zip) {
    Remove-Item -LiteralPath $zip -Force
  }
  if (Test-Path $downloadZip) {
    Remove-Item -LiteralPath $downloadZip -Force
  }

  $files = Get-ChildItem -LiteralPath $dist -Force
  Compress-Archive -Path $files.FullName -DestinationPath $zip -Force
  Compress-Archive -Path $dist -DestinationPath $downloadZip -Force

  Write-Host "Created $zip"
  Write-Host "Updated $downloadZip"
}
finally {
  Pop-Location
}
