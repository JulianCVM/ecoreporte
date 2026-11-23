import { existsSync } from 'node:fs';
import path from 'node:path';

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

/**
 * Ruta del archivo de configuración de Firebase para Android (ADR 0001).
 *
 * - `development` y `preview` usan `ecoreporte-dev` (paquete `.dev`): `./google-services.json`.
 * - `production` usaría `ecoreporte-prod`, que está proyectado y no existe (ADR 0007):
 *   `./google-services.prod.json`.
 * - `GOOGLE_SERVICES_JSON` lo reemplaza (por ejemplo, en un build de CI).
 *
 * El archivo está fuera de git. Si falta, se devuelve `undefined` y el plugin de React
 * Native Firebase avisa al hacer prebuild. Así, lint, pruebas y CI no lo necesitan.
 */
export function resolveGoogleServicesFile(
  appVariant: Variant,
  env: Record<string, string | undefined>,
  fileExists: (file: string) => boolean,
): string | undefined {
  const file =
    env.GOOGLE_SERVICES_JSON ||
    (appVariant === 'production' ? './google-services.prod.json' : './google-services.json');
  return fileExists(file) ? file : undefined;
}

const googleServicesFile = resolveGoogleServicesFile(variant, process.env, (file) =>
  existsSync(path.resolve(__dirname, file)),
);

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
    // iOS no se compila en esta etapa (no hay Mac). Cuando se haga, va GoogleService-Info.plist.
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
    // Android 13+: sin este permiso declarado no se puede pedir el de notificaciones (RF08).
    permissions: ['android.permission.POST_NOTIFICATIONS'],
    googleServicesFile,
  },
  web: {
    output: 'server',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    [
      'expo-build-properties',
      {
        // React Native Firebase en iOS exige frameworks estáticos.
        ios: { useFrameworks: 'static' },
        // RN 0.88 trae Kotlin 2.2.0, pero firebase-auth 25 (BoM 35.0.2 de RNFB 27.1.1) está
        // compilado con Kotlin 2.4 y 2.2 no lee esos metadatos. Kotlin 2.3 sí (issue #4).
        android: { kotlinVersion: '2.3.21' },
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'EcoReporte usa la cámara para tomar la foto de cada reporte.',
        // La app solo toma fotos (RF01): sin audio ni lector de códigos, el APK pide menos
        // permisos y pesa menos.
        microphonePermission: false,
        recordAudioAndroid: false,
        barcodeScannerEnabled: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'EcoReporte usa tu ubicación para marcar dónde están los residuos de cada reporte.',
        // Solo se lee en primer plano, con la pantalla Reportar abierta (RF01): sin ubicación
        // en segundo plano ni detección de actividad.
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        motionUsagePermission: false,
      },
    ],
    // Mapa sin clave ni facturación (ADR 0008). Trae código nativo.
    '@maplibre/maplibre-react-native',
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
