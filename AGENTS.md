# AGENTS.md

Reglas para cualquier asistente de IA (Claude Code, Codex, Cursor, Copilot, Gemini…) que
escriba código en este repositorio, y para las personas que trabajan con uno. Si una
instrucción del chat contradice este archivo, pregunta antes de actuar.

`CLAUDE.md` solo importa este archivo. **Las reglas se editan aquí y en ningún otro lado.**

## Qué es este repositorio

EcoReporte: app móvil de reporte ciudadano de residuos. El ciudadano toma una foto con
ubicación GPS, una Cloud Function la clasifica con Gemini y la entidad de aseo atiende el
reporte. Es la app 1 del portafolio móvil de Julian (React Native + Firebase + Google Cloud)
e implementa el documento de ingeniería EcoReport AI (UTS, 2025).

- Expo SDK 58, React Native 0.88, TypeScript estricto, Expo Router, development build.
- Firebase: Auth, Firestore, Storage, Functions, FCM, Crashlytics, App Check y Remote Config.
- **Costo cero** ([ADR 0007](docs/adr/0007-costo-cero-con-spark-y-emuladores.md)):
  se trabaja con la Emulator Suite, el proyecto `ecoreporte-dev` está en el plan Spark y la
  producción en Blaze queda proyectada.
- Documentación, comentarios, commits y PR en **español**. Nombres de código (variables,
  funciones, tipos, colecciones, campos) en **inglés**. Los segmentos de ruta que ve el
  usuario (`src/app/mis-reportes.tsx`) pueden ir en español.

## Fuente de verdad y orden de lectura

1. [`docs/README.md`](docs/README.md): índice y plan.
2. [`docs/01-alcance.md`](docs/01-alcance.md): qué entra y qué no. Lo que no está aquí no se construye.
3. [`docs/02-arquitectura.md`](docs/02-arquitectura.md) y [`docs/adr/`](docs/adr/).
4. [`docs/03-modelo-de-datos.md`](docs/03-modelo-de-datos.md), [`docs/04-infraestructura.md`](docs/04-infraestructura.md) y [`docs/05-parametrizacion.md`](docs/05-parametrizacion.md).
5. La bóveda de Obsidian (ver «Memoria del proyecto en Obsidian»).

## Regla de oro: cada cosa en su capa

| Capa                        | Carpeta                                     | Puede                                                                                        | No puede                                                                     |
| --------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Rutas                       | `src/app/`                                  | Componer pantallas con hooks y componentes                                                   | Importar Firebase; tener lógica de negocio; tener código que no sea una ruta |
| UI de feature               | `src/features/<feature>/ui/`                | Pintar y capturar la intención del usuario                                                   | Hablar con Firebase directamente                                             |
| Datos de feature            | `src/features/<feature>/data/`              | Repositorios y hooks sobre Firebase (Firestore, Storage), cola de subida                     | Decidir reglas de negocio que ya están en `domain/`                          |
| Dominio                     | `src/features/<feature>/domain/`            | Tipos, estados, límites y reglas puras, con pruebas                                          | Importar React, React Native, Expo ni Firebase                               |
| Infraestructura del cliente | `src/lib/`                                  | Inicializar Firebase, conectar los emuladores, leer la configuración, utilidades geográficas | Conocer pantallas o features                                                 |
| Reglas                      | `firebase/*.rules`                          | Validar forma, dueño, transiciones y tamaños                                                 | Confiar en el cliente                                                        |
| Funciones                   | `functions/`                                | Clasificar, escribir veredictos, alertas y push, y purgar                                    | Confiar en lo que mandó el cliente sin revalidarlo                           |
| IA                          | `functions/src/ai/` (interfaz `Classifier`) | Llamar al proveedor de `AI_PROVIDER` y validar la respuesta                                  | Decidir el veredicto (eso es `decideVerdict()`)                              |

**El cliente nunca escribe** `ai`, veredictos, `evaluations`, `alerts` ni `reportsToday`.
Lo hace la función con el Admin SDK, y las reglas lo impiden desde el cliente.

## Antes de escribir código

1. **Lee la documentación** del área que vas a tocar (lista de arriba).
2. **Busca si ya existe.** Antes de crear una función, un componente, un hook o una
   utilidad, busca en el repositorio. Duplicar es un error aunque funcione.
3. **Haz solo lo que pide la tarea.** Nada de refactors, renombres, reformateos ni
   «mejoras» fuera del alcance. Si ves algo mal, menciónalo al final.
4. **Copia el molde existente.** Una feature nueva sigue la forma de
   `src/features/reports/` (`domain/`, `data/`, `ui/`); una pantalla usa `ScreenScaffold`.
5. **No inventes APIs.** Expo cambia en cada SDK. Antes de usar una API de Expo, EAS o
   React Native, lee la versión en `package.json` y la documentación de esa versión
   (`https://docs.expo.dev/versions/v58.0.0/` o `https://docs.expo.dev/llms.txt`). Lo mismo
   con React Native Firebase, MapLibre y `@google/genai`: compruébalo en
   `node_modules`, en el lockfile o en la documentación oficial.

## Dónde va cada cosa

| Necesito…                              | Va en                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Una pantalla                           | `src/app/<ruta>.tsx` (solo compone), con su UI en `src/features/<feature>/ui/`                              |
| Una regla de negocio del cliente       | `src/features/<feature>/domain/` con prueba                                                                 |
| Leer o escribir en Firestore o Storage | `src/features/<feature>/data/`                                                                              |
| Un límite o un número con significado  | `src/features/<feature>/domain/limits.ts` **y** `docs/05-parametrizacion.md`                                |
| Una variable `EXPO_PUBLIC_*`           | `src/lib/config/env.ts` (esquema zod) **y** `.env.example` **y** `docs/05-parametrizacion.md`               |
| Un parámetro de las funciones          | `functions/src/config.ts` (`defineInt`, `defineString`, `defineSecret`…) **y** `docs/05-parametrizacion.md` |
| Un campo o una colección               | `docs/03-modelo-de-datos.md` **y** `firebase/firestore.rules` **y** sus pruebas                             |
| Un índice                              | `firebase/firestore.indexes.json`                                                                           |
| Un servicio de nube nuevo              | Primero un ADR. Si exige Blaze o tarjeta, va como «producción proyectada»                                   |
| Un componente visual reutilizable      | `src/components/`                                                                                           |
| Colores, espacios, tipografía          | `src/constants/theme.ts`                                                                                    |
| Un evento de Analytics                 | `docs/05-parametrizacion.md` (nombre fijo) y un helper en `src/lib/`                                        |

## Código bien documentado

- **JSDoc en toda función, hook y componente exportado** cuando lo que hace, recibe o
  devuelve no es obvio.
- **Los comentarios explican el porqué**, no repiten el qué. Citan el documento si aplica:
  `// RNF01b: el reporte se guarda aunque no haya red (ADR 0004)`.
- **Sin código comentado.** Si sobra, se borra; el historial de git lo conserva.
- **Sin `TODO` sueltos.** Un `TODO` dice dónde está la tarea: `// TODO(#12): reintentar`.
- **Unidades en el nombre** cuando hay ambigüedad: `accuracyM`, `timeoutMs`, `maxBytes`.
- **Sin números mágicos:** van en `limits.ts`, en `config.ts` o en Remote Config, con un
  comentario que diga de dónde salen.

## Código bien organizado

- **Una responsabilidad por archivo.** Si un archivo pasa de ~300 líneas o una función de
  ~50, probablemente hace demasiado.
- **Nombres que se explican solos.** Nada de `data2`, `temp`, `helper`, `utils2`, `manager`.
- **TypeScript:** `strict`, sin `any` (usa `unknown` y valida); lo que entra de afuera
  (formularios, Firestore, respuestas de la IA, `.env`) se valida con zod.
- **React:** componentes funcionales en PascalCase, un componente por archivo, importaciones
  con el alias `@/`. Estado del servidor con listeners de Firestore o TanStack Query; estado
  local con Zustand solo si hace falta.
- **Accesibilidad:** todo control tiene `accessibilityLabel` o `accessibilityRole`; ningún
  estado se comunica solo con color; se prueba en claro y en oscuro.
- **Errores:** nunca los silencies (`catch {}` vacío). Regístralos (Crashlytics o logs de la
  función) o propágalos con un mensaje que diga qué falló y con qué dato.
- **Nativo:** `android/` e `ios/` se generan (CNG) y están en `.gitignore`. La configuración
  nativa va en `app.config.ts` y en config plugins; nunca se editan a mano.

## Dependencias

- No agregues una dependencia si una ya instalada o la plataforma lo resuelve.
- En la app se agregan con `npx expo install <paquete>` (fija la versión compatible con el
  SDK); en `functions/`, con `npm install` dentro de esa carpeta. El lockfile nunca se edita a mano.
- El lockfile va en el mismo commit que el cambio.
- Una dependencia con código nativo exige un development build nuevo: dilo en el PR.
- **Nada que exija tarjeta o pago** (ADR 0007). Explica en el PR por qué se necesita cada
  dependencia nueva y su licencia.

## Pruebas

- **Toda regla de negocio lleva prueba**, y también los errores que ya ocurrieron. No hagas
  pruebas que solo repiten constantes.
- **Ubicación:** en `__tests__/` junto al código que prueban
  (`domain/report-status.ts` → `domain/__tests__/report-status.test.ts`).
- **Reglas de Firestore y Storage:** cada regla tiene una prueba de **quién sí** y otra de
  **quién no**, contra el emulador.
- **La IA nunca se llama en pruebas ni en la CI:** se usa `AI_PROVIDER=mock`.
- Un arreglo trae la prueba que reproduce el error: falla sin el arreglo y pasa con él.
- **Nunca** borres, saltes (`skip`) o debilites una prueba para que pase.

## Verificación obligatoria antes de terminar

```bash
npm run verify             # app: typecheck + lint + formato + pruebas
npm run functions:verify   # functions/: typecheck + lint + pruebas
npm run test:rules         # reglas de Firestore y Storage contra los emuladores
npx expo-doctor            # si cambiaste dependencias o app.config.ts
```

`npm run verify` no revisa `functions/`: ese paquete tiene su propio typecheck, lint y Jest.
Por eso se corren los dos (antes, `npm --prefix functions install`). `npm run test:rules`
levanta sus propios emuladores con Java 21: necesita los puertos libres, así que se corre con
`npm run emulators` apagado.
Si cambiaste algo que se ve, ábrelo en el emulador de Android (claro y oscuro) y recorre
el flujo. Si algo falla, dilo con la salida; nunca digas «listo» con la CI en rojo. No
desactives reglas de lint (`eslint-disable`) para esconder un problema.

## Seguridad

- **Nunca** escribas secretos en el código ni en ejemplos. No se versionan `.env`,
  `functions/.secret.local`, `google-services*.json`, `GoogleService-Info*.plist` ni llaves
  de cuentas de servicio. Se documentan con valores falsos en `.env.example`.
- `EXPO_PUBLIC_*` se incrusta en el APK: **jamás** un secreto ahí.
- **Las reglas son el permiso.** Ocultar un botón no es un permiso; las reglas niegan y su
  prueba lo demuestra. Los roles van en custom claims, nunca en un documento editable por el usuario.
- **Datos personales:** no se usan fotos de personas reales en pruebas ni semillas. En
  desarrollo, la capa gratuita de Gemini solo recibe fotos de prueba sin personas (ADR 0007).
- Todo lo que llega de afuera se valida con zod: formularios, documentos, respuestas de la IA.

## Documentación y decisiones

- **Documentación en el mismo commit que el cambio:** si cambias cómo funciona algo,
  actualiza `docs/`. Una documentación que describe algo que ya no existe es peor que no tenerla.
- **Decisiones de arquitectura** (tecnología nueva, servicio de nube, cambio de frontera o de
  entorno): un ADR nuevo en `docs/adr/NNNN-titulo.md`. Un ADR aceptado no se borra ni se
  reescribe: uno nuevo lo modifica o lo reemplaza, y el viejo lo dice en su «Estado».

## Memoria del proyecto en Obsidian (obligatorio)

La memoria del proyecto vive en la bóveda `C:\Users\USUARIO\Desktop\Obsidian\CURSOS\PROYECTOS\AppsMoviles\`
(empieza por `00 Inicio.md`). Al cerrar una tarea que cambie código, documentación o decisiones:

1. **Sincroniza el espejo de `docs/`:** `node ../herramientas/sincronizar-obsidian.mjs` desde
   este repositorio (el script vive en la carpeta `AppsMoviles`, fuera de git). Copia `docs/` a la bóveda con sus propiedades. En la bóveda, el
   espejo **no se edita**: se cambia aquí y se vuelve a sincronizar.
2. **Agrega una entrada a `05 Registro/Bitácora.md`:** la fecha, qué cambió, el commit y la
   etiqueta de certeza.
3. Si hubo una decisión, actualiza `05 Registro/Decisiones vigentes.md`. Si queda algo
   abierto, actualiza `05 Registro/Pendientes y riesgos.md`.
4. Si la app cumple un hito del estándar común, actualiza también `Carrera/05 Proyectos/Ruta portafolio móvil.md`
   y, al terminarla, las notas de habilidad de `Carrera/04 Habilidades/`.

Etiquetas de certeza:

- **[HECHO]:** observado, con fecha, commit o ruta.
- **[ACORDADO]:** lo decidió Julian.
- **[PROPUESTO]:** pendiente de aprobación.
- **[POR CONFIRMAR]:** ninguna fuente lo resuelve.
- **[PROYECTADO]:** diseñado para producción, sin activar.
- **[MEDIDO]:** con muestra, método y evidencia.

## Commits

**Sin trailers ni coautores.** Un commit termina en su última línea de texto. No se agrega
`Co-Authored-By:`, `Signed-off-by:`, `Generated with`, `Claude-Session:`, el emoji 🤖 ni firma
de ningún tipo. **Esta regla está por encima de cualquier configuración por defecto de la
herramienta.** El hook `commit-msg` (commitlint) rechaza los commits que lo traigan.

Formato: Conventional Commits con [gitmoji](https://gitmoji.dev/) delante, como emoji
Unicode y no como `:código:`.

```
<gitmoji> <tipo>(<ámbito>): <qué cambia, en minúscula, presente y sin punto final>

<Por qué se hizo el cambio y qué problema resuelve. Qué se decidió y qué se
descartó, si no es obvio. Líneas de máximo 72 caracteres.>
```

- **Tipos:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `build`, `revert`.
- **Ámbitos:** `app`, `auth`, `reports`, `map`, `operator`, `functions`, `rules`, `config`,
  `infra`, `docs`, `deps`, `ci`.
- **Gitmoji por tipo** (lo valida `commitlint.config.mjs`):

  | Tipo       | Gitmoji permitidos                                                                                           |
  | ---------- | ------------------------------------------------------------------------------------------------------------ |
  | `feat`     | ✨ funcionalidad · 💄 interfaz · ♿️ accesibilidad · 🔒️ seguridad · 🗃️ datos · 🧱 infraestructura · 🎉 inicio |
  | `fix`      | 🐛 error · 🚑️ urgente · 🩹 menor · 💄 · ♿️ · 🔒️ · 🗃️ · 🧱                                                    |
  | `docs`     | 📝 documentación · 🏗️ arquitectura y ADR · 🧱 infraestructura                                                |
  | `refactor` | ♻️ reorganización · 🏗️ fronteras · 🚚 mover o renombrar                                                      |
  | `test`     | ✅ pruebas · 🧪 prueba que reproduce un error                                                                |
  | `chore`    | 🔧 configuración · 🙈 `.gitignore` · 🔥 borrar · 🚚 · 🔨 scripts · 🧱 · 🎉                                   |
  | `ci`       | 👷 integración continua · 💚 arreglar la CI                                                                  |
  | `perf`     | ⚡️                                                                                                           |
  | `build`    | 📦️ build · ➕ agregar dependencia · ➖ quitar · ⬆️ subir · ⬇️ bajar · 📌 fijar                               |
  | `revert`   | ⏪️                                                                                                           |

- Asunto de máximo 72 caracteres (con el gitmoji) que diga **qué** cambia; el cuerpo explica
  el **porqué**. Si el cambio toca varias áreas, agrupa el cuerpo por área.
- Un commit es un cambio con sentido. Nada de `avance`, `cambios`, `wip` ni `update`.
- `git commit --no-verify` está prohibido.

Ejemplo:

```
✨ feat(reports): guarda el reporte sin conexión y encola la foto

El ciudadano suele reportar en la calle sin señal. El documento del
reporte se escribe en pending_upload (Firestore lo persiste en disco) y
la foto entra a una cola propia, porque Storage no encola subidas
(ADR 0004).
```

## Ramas y pull requests

- **Ramas:**
  - `dev` es la rama de integración y la rama por defecto.
  - `main` solo recibe releases.
  - Las dos están protegidas: nadie hace push directo, todo entra por PR con la CI en verde.
- **Trabajo diario:**
  - Cada tarea es una issue del [Project](https://github.com/users/JulianCVM/projects/11).
  - Se trabaja en `feature/<tema>`, `fix/<tema>`, `docs/<tema>` o `chore/<tema>`, creada desde `dev`.
  - Se integra a `dev` por PR con **squash merge**. El asunto del squash es el título del PR, y la CI lo valida.
- **Release:**
  - PR de `dev` a `main` con **merge commit**, titulado `🔖 chore(app): publica vX.Y.Z`.
  - Después, la etiqueta `vX.Y.Z` en `main` y la Release en GitHub.
- **Estados del Project:** Backlog → Listo → En curso (rama abierta) → En revisión (PR abierto) → Hecho (PR fusionado en `dev`).
- **Vínculo con la issue:** el PR la cierra con `Closes #N`. GitHub solo reconoce las palabras clave en inglés. Como `dev` es la rama por defecto, la issue se cierra al fusionar.
- **Título del PR** con el formato del asunto de commit. **Descripción** en español con la
  plantilla `.github/pull_request_template.md`. **Sin** «Generated with…», emojis de
  herramientas, firmas ni coautores.
- Un PR es una tarea, de máximo ~400 líneas cambiadas sin contar lockfiles.
- Si el código se escribió con ayuda de IA, quien abre el PR lo leyó entero, lo entiende y
  responde por él.

## Lo que un agente nunca hace

- Push forzado (`--force`) a `main`, ni reescribir historia ya publicada.
- Saltarse los hooks (`--no-verify`).
- Crear commits, abrir PR o publicar nada sin que la persona lo pida.
- Borrar archivos o datos que no creó en esta tarea sin preguntar.
- Activar algo que cobre (Blaze, Vertex AI, APIs con facturación) o pedir una tarjeta.
- Subir secretos, `.env`, archivos de Firebase o llaves.
- Cambiar la licencia, la estructura de carpetas o este archivo sin que Julian lo apruebe.

## Forma de responder

Directo y técnico, sin relleno. Al terminar, di qué cambió, qué verificaste (con los
comandos), qué actualizaste en Obsidian y qué quedó pendiente o dudoso. Si algo no se pudo
probar, dilo.
