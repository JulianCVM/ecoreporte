# 06 · Demostración

Cómo mostrar EcoReporte de punta a punta en un PC, sin proyecto real ni costo: emulador de Android, Emulator Suite y la IA simulada (`AI_PROVIDER=mock`, [ADR 0007](adr/0007-costo-cero-con-spark-y-emuladores.md)).

## Preparación

Con el entorno ya montado (ver «Puesta en marcha desde cero» en [04 · Infraestructura](04-infraestructura.md)):

| Paso | Comando                  | Qué hace                                                              |
| ---- | ------------------------ | --------------------------------------------------------------------- |
| 1    | `npm run emulators`      | Compila `functions/` y levanta Auth, Firestore, Storage y Functions   |
| 2    | `npm run emulators:demo` | Siembra las cuentas y los reportes de demostración (en otra terminal) |
| 3    | `npm run android`        | Compila el development build y abre la app en el emulador de Android  |

La semilla (`scripts/sembrar-demo.js`) solo habla con los emuladores y se puede correr varias veces: los ID son fijos y cada corrida deja los mismos datos. La foto de los reportes sembrados es un dibujo (`scripts/demo/foto-de-prueba.jpg`); no hay fotos de personas.

### Cuentas

Todas con la contraseña `EcoReporte123`, que solo existe en el emulador.

| Correo                 | Rol       | Para mostrar                                             |
| ---------------------- | --------- | -------------------------------------------------------- |
| `ana@example.com`      | Ciudadana | Reportar, «Mis reportes», el detalle y el mapa           |
| `luis@example.com`     | Ciudadano | Que el mapa muestra reportes de otros sin decir de quién |
| `operador@example.com` | Operador  | La bandeja: alertas, revisión y atención                 |

### Datos sembrados

Diez reportes alrededor del centro de Bucaramanga (7.11935, -73.12274). Para que el mapa y los reportes nuevos caigan ahí, fija la ubicación del emulador de Android con `adb emu geo fix -73.12274 7.11935`:

- Tres aprobados, uno en atención y dos resueltos, a menos de 3 km: son los seis puntos del mapa.
- Dos en revisión (uno con poca confianza de la IA y otro en el que la IA falló) y uno rechazado: no salen en el mapa.
- Uno aprobado a 6 km: no sale en el mapa por distancia.
- Una alerta abierta (escombros, complejidad alta) y una cerrada.

## Recorrido

| #   | Quién    | Qué se hace                                                       | Qué se ve                                                                                   | Requisito  |
| --- | -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------- |
| 1   | Ana      | Entrar y abrir «Reportar»                                         | Cámara, ubicación con su precisión y nota                                                   | RF01       |
| 2   | Ana      | Tomar la foto y enviar                                            | «Reporte guardado»; en «Mis reportes» pasa solo de pendiente a su veredicto                 | RF02, RF04 |
| 3   | Ana      | Activar el modo avión, enviar otro reporte y quitar el modo avión | Queda «Pendiente de subir» con su miniatura; al volver la red sube y recibe veredicto       | RNF01b     |
| 4   | Ana      | Abrir «Ver detalle e historial» de un reporte                     | Foto, análisis de la IA, ubicación e historial con quién hizo cada cambio                   | RF06       |
| 5   | Ana      | Abrir «Mapa», marcar «Escombros» y tocar un punto                 | Seis puntos; el filtro deja dos; el punto tocado resalta su tarjeta                         | RF05       |
| 6   | Operador | Salir, entrar como operador y abrir «Bandeja»                     | La pestaña solo existe para el operador; arriba la alerta de escombros                      | RF07, RF03 |
| 7   | Operador | «Marcar como atendida» y «Cerrar la alerta»                       | La alerta cambia de estado y sale de la lista                                               | RF03       |
| 8   | Operador | Aprobar el reporte en revisión, empezar la atención y resolverlo  | Cada cambio pide confirmación; el reporte sale de la bandeja al resolverse                  | RF07       |
| 9   | Ana      | Volver a entrar y abrir «Mapa» y «Mis reportes»                   | El reporte que aprobó el operador ya es un punto del mapa; el historial dice quién lo movió | RF05, RF06 |

Para mostrar los topes de uso (RNF05): poner `AI_DAILY_LIMIT=2` en `functions/.env.local`, reiniciar los emuladores y enviar tres reportes; el tercero queda «En revisión» y su historial dice que se alcanzó el cupo diario.

## Lo que la demostración no muestra

- **IA real:** el veredicto sale de `MockClassifier`, que elige entre cinco respuestas según el contenido de la foto. Con `AI_PROVIDER=gemini-api` y una clave en `functions/.secret.local` se usa Gemini (capa gratuita, solo fotos sin personas).
- **Push (RF08 y la parte con la app cerrada de RF03):** FCM no tiene emulador; necesita el proyecto real.
- **La foto de la cámara:** la cámara del emulador de Android entrega una imagen negra con la hora. En un teléfono es la foto real.
- **Los datos no se guardan** si los emuladores se cierran a la fuerza: `--export-on-exit` solo exporta al salir con Ctrl+C. Con volver a correr `npm run emulators:demo` quedan igual.
