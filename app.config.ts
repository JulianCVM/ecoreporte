import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuración por variante (docs/05-parametrizacion.md · Build).
 * APP_VARIANT: development | preview | production.
 */
type Variant = 'development' | 'preview' | 'production';

const variant = (process.env.APP_VARIANT ?? 'development') as Variant;
const isProd = variant === 'production';

const BASE_ID = 'com.juliancvm.ecoreporte';
const appId = isProd ? BASE_ID : `${BASE_ID}.dev`;
const appName = isProd
  ? 'EcoReporte'
  : variant === 'preview'
    ? 'EcoReporte Preview'
    : 'EcoReporte Dev';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'ecoreporte',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: isProd ? 'ecoreporte' : 'ecoreporte-dev',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: appId,
    // Se activa cuando exista el archivo de Firebase (ADR 0001):
    // googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
  },
  android: {
    package: appId,
    adaptiveIcon: {
      backgroundColor: '#E8F3EC',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
  web: {
    output: 'server',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#1F6F4A',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appVariant: variant,
  },
});
