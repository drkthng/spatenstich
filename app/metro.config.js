// Prevent Expo from using monorepo root as Metro server root — the SSR entry
// path would otherwise be computed relative to the workspace root while Metro
// resolves it from projectRoot, causing "cannot resolve expo-router/entry".
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.assetExts.push('wasm');

// Resolve @spatenstich/shared subpath exports that Metro can't handle
// (unstable_enablePackageExports breaks expo-router/entry)
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@spatenstich/shared/i18n/de') {
    return {
      filePath: path.resolve(monorepoRoot, 'packages/shared/src/i18n/de.json'),
      type: 'sourceFile',
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// expo-sqlite Web: SharedArrayBuffer benötigt COOP+COEP-Header
config.server = {
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
