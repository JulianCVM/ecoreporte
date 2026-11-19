## Qué cambia

<!-- Resumen en 1-3 líneas. -->

Cierra #

<!-- El PR va contra `dev` (release: `dev` → `main`). El título es el asunto del squash: `<gitmoji> <tipo>(<ámbito>): <asunto>`. -->

## Ámbito

- [ ] app - [ ] auth - [ ] reports - [ ] map - [ ] operator - [ ] functions - [ ] rules - [ ] config - [ ] infra - [ ] docs

## Cómo se probó

<!-- Comandos y salida de `npm run verify`; capturas si cambia algo que se ve (claro y oscuro). -->

## Checklist

- [ ] El título sigue el formato `<gitmoji> <tipo>(<ámbito>): <asunto>`.
- [ ] `npm run verify` pasa en local y la CI está en verde.
- [ ] Agregué o actualicé pruebas si cambia comportamiento (reglas: quién sí y quién no).
- [ ] Actualicé `docs/` (y un ADR si cambia una decisión) en este mismo PR.
- [ ] Actualicé la bóveda de Obsidian (`AppsMoviles/`): Bitácora y, si aplica, Decisiones o Pendientes.
- [ ] No hay secretos, `.env`, `google-services.json` ni datos personales en el commit.
- [ ] Ningún cambio exige plan Blaze ni tarjeta (ADR 0007); si lo exige, va como «producción proyectada».
