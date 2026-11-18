# ADR 0001 · Development build y React Native Firebase

- **Estado:** aceptada · 2026-11-18

## Contexto

La app necesita: guardar reportes sin conexión, Crashlytics, App Check, cámara y mapa. Expo Go solo trae sus módulos nativos. El SDK web de Firebase (`firebase`) funciona en Expo Go, pero en React Native **no tiene caché persistente de Firestore**: la persistencia del SDK web usa IndexedDB, que React Native no tiene. Sin conexión, un reporte quedaría solo en memoria y se perdería al cerrar la app. Además, el SDK web no trae Crashlytics y su App Check no tiene proveedores nativos.

## Decisión

- **React Native Firebase** (`@react-native-firebase/*`, API modular), que envuelve los SDK nativos de Android e iOS. Firestore persiste en disco por defecto.
- **Development build** (`expo-dev-client`), generado con `npx expo run:android` en local o con `eas build --profile development`.
- Los archivos de Firebase se inyectan con los config plugins de React Native Firebase desde `app.config.ts`.

## Consecuencias

- ➕ Funciona sin conexión de verdad, con Crashlytics, App Check nativo y FCM.
- ➕ Es lo que se pregunta en una entrevista: módulos nativos, config plugins, CNG (Continuous Native Generation) y EAS Build.
- ➖ Cada dependencia nativa nueva exige reconstruir el build; no se prueba en Expo Go.
- ➖ El primer build local necesita JDK 17 o 21 y `ANDROID_HOME`. En este equipo `java` del PATH es el 25: se usa el JBR de Android Studio (ver README).
