import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'Spatenstich',
  slug: 'spatenstich',
  version: '0.1.0',
  orientation: 'default',
  scheme: 'spatenstich',
  userInterfaceStyle: 'light',
  icon: './public/icons/icon-512.png',
  splash: {
    backgroundColor: '#F6F1E7',
  },
  ios: { bundleIdentifier: 'de.spatenstich.app', supportsTablet: true },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './public/icons/favicon-32.png',
  },
  plugins: [
    'expo-router',
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG ?? 'spatenstich',
        project: 'spatenstich-app',
        url: 'https://sentry.io/',
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '71458ebd-fa49-4abd-8310-70d92cce5261',
    },
  },
};
export default config;
