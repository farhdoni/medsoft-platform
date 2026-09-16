const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// .html isn't an asset extension by default, so require('./x.html') would
// otherwise get parsed as JS source — needed for the local splash HTML
// (assets/splash/aivita-splash.html), loaded via Asset.fromModule in
// SplashScreen.tsx.
config.resolver.assetExts = [...config.resolver.assetExts, 'html'];
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'html');

module.exports = config;
