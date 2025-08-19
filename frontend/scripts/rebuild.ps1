# scripts/rebuild.ps1
# Save this file with UTF-8 with BOM encoding

# Clean
Write-Host "[CLEAN] Removing build artifacts..."
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Install
Write-Host "[INSTALL] Running pnpm install..."
pnpm install --frozen-lockfile

# Build
Write-Host "[BUILD] Starting production build..."
$env:NEXT_PUBLIC_DEBUG="1"
pnpm run build

# Complete
Write-Host "[SUCCESS] Build completed successfully"
