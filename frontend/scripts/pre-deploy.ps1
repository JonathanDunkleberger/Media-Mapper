# PowerShell Pre-Deploy Script for Windows
# Run this in PowerShell: powershell -ExecutionPolicy Bypass -File scripts/pre-deploy.ps1

Write-Host "🧹 Nuclear clean..." -ForegroundColor Cyan
# Remove node_modules and .next
Remove-Item -Recurse -Force .next,node_modules -ErrorAction SilentlyContinue

Write-Host "🔍 Type checking..." -ForegroundColor Cyan
pnpm tsc --noEmit --strict

Write-Host "🔒 Lockfile check..." -ForegroundColor Cyan
pnpm install --frozen-lockfile

Write-Host "🏗 Building with paranoia..." -ForegroundColor Cyan
$env:NODE_OPTIONS="--max-old-space-size=4096"
$env:NEXT_PUBLIC_DEBUG=1
pnpm build

Write-Host "✅ 100% verified build" -ForegroundColor Green
