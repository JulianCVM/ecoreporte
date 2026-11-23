#!/usr/bin/env node
/**
 * Asigna el custom claim `role` a una cuenta del emulador de Auth (RF07).
 *
 *   npm run emulators:rol -- operador@example.com operator
 *   npm run emulators:rol -- operador@example.com citizen    (quita el rol)
 *
 * Solo habla con la Emulator Suite: usa su API REST con el token `owner`, que un proyecto real
 * no acepta. En producción (proyectada) el rol lo asigna un administrador con el Admin SDK.
 * La app lee el rol del token: después de asignarlo hay que cerrar sesión y volver a entrar.
 */
const AUTH_EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'ecoreporte-dev';
const ROLES = ['citizen', 'operator', 'admin'];

async function call(method, body) {
  const url = `http://${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`accounts:${method} respondió ${response.status}: ${await response.text()}`);
  return response.json();
}

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role)) {
    throw new Error(`Uso: npm run emulators:rol -- <correo> <${ROLES.join('|')}>`);
  }
  const { users } = await call('lookup', { email: [email] });
  if (!users?.length) throw new Error(`No hay una cuenta con el correo ${email} en el emulador`);
  const [{ localId }] = users;
  // El ciudadano no lleva claim: así se ve igual que una cuenta recién creada.
  const claims = role === 'citizen' ? {} : { role };
  await call('update', { localId, customAttributes: JSON.stringify(claims) });
  console.log(
    `Listo: ${email} (${localId}) ahora es ${role}. Cierra sesión y vuelve a entrar en la app.`,
  );
}

main().catch((error) => {
  console.error(`No se pudo asignar el rol: ${error.message}`);
  process.exitCode = 1;
});
