# Downloads the remote logo and generates favicon/icon sizes if ImageMagick is installed.
# Usage: run this in PowerShell from the repo root or directly: ./frontend/scripts/fetch_and_generate_logo.ps1

param()

$logoUrl = 'https://i.ibb.co/Psd6QHCT/logo.png'
$publicDir = Join-Path $PSScriptRoot '..\public' | Resolve-Path -Relative
$publicDir = (Resolve-Path (Join-Path $PSScriptRoot '..\public')).Path
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir | Out-Null }
$logoPath = Join-Path $publicDir 'logo.png'

Write-Host "Downloading logo from $logoUrl to $logoPath ..."
try {
    Invoke-WebRequest -Uri $logoUrl -OutFile $logoPath -UseBasicParsing -ErrorAction Stop
    Write-Host "Downloaded logo.png"
} catch {
    Write-Host "Failed to download logo: $_"
    exit 1
}

# Generate resized icons if ImageMagick 'magick' is available
$magick = Get-Command magick -ErrorAction SilentlyContinue
if ($magick) {
    Write-Host "ImageMagick found. Generating favicon and resized PNGs..."
    Push-Location $publicDir
    try {
        magick convert logo.png -resize 192x192 logo-192.png
        magick convert logo.png -resize 512x512 logo-512.png
        magick convert logo.png -resize 32x32 favicon-32.png
        magick convert logo.png -resize 16x16 favicon-16.png
        magick convert favicon-32.png favicon.ico
        Write-Host "Generated logo-192.png, logo-512.png, favicon.ico"
    } catch {
        Write-Host "ImageMagick command failed: $_"
    }
    Pop-Location
} else {
    Write-Host "ImageMagick (magick) not found. Skipping automatic favicon generation.\nIf you want favicons generated automatically, install ImageMagick and rerun this script.\nYou can still use the downloaded 'logo.png' placed in 'frontend/public/'."
}

Write-Host "Done. If you want me to modify HTML to reference favicons/manifest, let me know."
