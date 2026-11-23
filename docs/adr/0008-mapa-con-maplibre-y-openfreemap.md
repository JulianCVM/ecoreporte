# ADR 0008 · Mapa con MapLibre y teselas de OpenFreeMap

- **Estado:** aceptada · 2026-11-18 (compatibilidad con Expo SDK 58 y React Native 0.88 **confirmada el 2026-11-23** con la versión 11.5.1 y su config plugin, en un development build de Android; iOS sin probar)

## Contexto

`react-native-maps` y `expo-maps` usan Google Maps en Android. Google Maps Platform pide una cuenta de facturación aunque el uso sea gratuito, y aquí no hay presupuesto ([ADR 0007](0007-costo-cero-con-spark-y-emuladores.md)). Las teselas de `tile.openstreetmap.org` no se pueden usar de forma intensiva en apps, según su política de uso.

## Decisión

- **`@maplibre/maplibre-react-native`**: motor de mapas vectoriales de código abierto, con config plugin para Expo y development build (ya exigido por ADR 0001).
- **Estilo de OpenFreeMap** (teselas vectoriales de OpenStreetMap, gratis, sin clave ni registro), en `EXPO_PUBLIC_MAP_STYLE_URL`, para poder cambiar de proveedor sin tocar el código.
- La atribución «© OpenStreetMap contributors» queda visible en el mapa.

## Alternativas descartadas

- Google Maps (react-native-maps o expo-maps): exige facturación.
- Mapbox: exige cuenta y token, con capa gratuita limitada.
- Un servidor de teselas propio: no se justifica para un portafolio.

## Consecuencias

- ➕ Sin claves ni costos; el estilo se cambia por configuración.
- ➖ No funciona en Expo Go (ya no se usa).
- ➖ Depende de un servicio gratuito sin garantía de disponibilidad: si falla, se cambia la URL del estilo.
