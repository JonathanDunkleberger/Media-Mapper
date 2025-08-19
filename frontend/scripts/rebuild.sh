#!/bin/bash
echo "🧹 Nuclear clean..."
rd /s /q .next 2>nul
rd /s /q node_modules 2>nul

echo "🔒 Fresh install..."
pnpm install --frozen-lockfile

echo "🏗 Building with debug..."
set NEXT_PUBLIC_DEBUG=1
pnpm run build

echo "✅ Build complete"
