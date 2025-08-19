module.exports = {
  output: 'standalone'
};module.exports = {
  productionBrowserSourceMaps: true, // Better error debugging
  typescript: {
    ignoreBuildErrors: false, // Ensure strict builds
  },
  eslint: {
    ignoreDuringBuilds: false, // Enforce linting
  },
  // Vercel cache-busting build ID
  generateBuildId: () => Date.now().toString(),
};
