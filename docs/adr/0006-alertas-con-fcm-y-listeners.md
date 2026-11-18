# ADR 0006 · Alertas con FCM y listeners en lugar de WebSocket

- **Estado:** aceptada · 2026-11-18

## Contexto

El documento pide alertas al SOC por WebSocket en menos de 2 s. Un servidor WebSocket propio exige un proceso siempre encendido, que Cloud Functions no ofrece.

## Decisión

- **Con la app abierta:** el operador escucha `alerts` con `onSnapshot`. Firestore entrega el cambio en tiempo real (internamente es un canal de streaming, igual que un WebSocket).
- **Con la app cerrada:** la función envía una notificación FCM al tema `operators`, y al autor cuando su reporte cambia de estado.
- **Medición:** `alerts.createdAt` (servidor) frente a la hora en que la app muestra la alerta (evento de Analytics). Meta: ≤ 2 s con la app abierta. **[POR MEDIR]**.

## Consecuencias

- ➕ Sin servidor que mantener; las push funcionan con la app cerrada (un WebSocket no).
- ➖ La entrega de FCM no tiene garantía de tiempo (el sistema operativo la puede demorar): con la app cerrada la meta de 2 s no aplica, y así se dice.
