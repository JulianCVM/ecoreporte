# ADR 0002 · Firebase y GCP en lugar de la pila del documento original

- **Estado:** aceptada · 2026-11-18

## Contexto

El documento EcoReport AI (2025) propone React Native + Spring Boot + PostgreSQL + TensorFlow Lite + WebSocket + un dashboard React. Esta versión es un proyecto de portafolio de una sola persona, construido para demostrar React Native, Firebase y Google Cloud.

## Decisión

| Documento                                    | Esta app                                                   | Por qué                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Spring Boot (core geolocalizado)             | Reglas de Firestore + Cloud Functions                      | Sin servidor que mantener; la lógica que no puede estar en el cliente vive en funciones                        |
| PostgreSQL                                   | Cloud Firestore                                            | Offline nativo y listeners en tiempo real; las consultas por cercanía se resuelven con geohash                 |
| TensorFlow Lite (modelo propio)              | Gemini en Vertex AI con salida estructurada                | No hay dataset propio etiquetado; un modelo general con un esquema de respuesta resuelve las cuatro categorías |
| WebSocket hacia el SOC                       | Listeners de Firestore + FCM                               | Ver ADR 0006                                                                                                   |
| Microservicio de IA escalable aparte (RNF04) | Función `classifyReportPhoto` con su propio `maxInstances` | Escala sola y por separado                                                                                     |

Se mantienen los actores, los requisitos (con su ID), los tres veredictos y los criterios de aceptación.

## Consecuencias

- ➕ Una persona puede construirlo y operarlo; el costo de demo es casi cero.
- ➖ Modelar en NoSQL obliga a desnormalizar (`location` también en `alerts`) y a pensar los índices de antemano.
- ➖ Las consultas geoespaciales son aproximadas (geohash) y se filtran por distancia en el cliente.
- Si en el futuro hace falta SQL (reportes analíticos), se exporta Firestore a BigQuery con la extensión oficial, sin cambiar la app.
