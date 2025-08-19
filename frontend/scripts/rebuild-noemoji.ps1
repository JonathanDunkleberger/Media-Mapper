# scripts/rebuild-noemoji.ps1
# Doesn't require special encoding

Write-Host "STEP 1/4: Cleaning build artifacts..."
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

Write-Host "STEP 2/4: Installing dependencies..."
pnpm install --frozen-lockfile

Write-Host "STEP 3/4: Building application..."
$env:NEXT_PUBLIC_DEBUG="1"
pnpm run build

Write-Host "STEP 4/4: Build successful"
