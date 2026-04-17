import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'Spatenstich',
  slug: 'spatenstich',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'spatenstich',
  userInterfaceStyle: 'automatic',
  ios: { bundleIdentifier: 'de.spatenstich.app', supportsTablet: true },
  web: {
    bundler: 'metro',
    output: 'static',
    headers: [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ],
  },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
  extra: {
    eas: {
      projectId: '71458ebd-fa49-4abd-8310-70d92cce5261',
    },
  },
};
export default config;
