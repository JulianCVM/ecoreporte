import { z } from 'zod';

import { DISPLAY_NAME_MAX_CHARS, DISPLAY_NAME_MIN_CHARS, PASSWORD_MIN_LENGTH } from './limits';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Escribe tu correo.')
  .pipe(z.email('El correo no es válido.'));

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);

export const signInSchema = z.object({
  email,
  // Al entrar no se exige el mínimo: una cuenta vieja puede tener una contraseña más corta.
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(
        DISPLAY_NAME_MIN_CHARS,
        `El nombre debe tener al menos ${DISPLAY_NAME_MIN_CHARS} letras.`,
      )
      .max(DISPLAY_NAME_MAX_CHARS, `El nombre puede tener hasta ${DISPLAY_NAME_MAX_CHARS} letras.`),
    email,
    password,
    passwordConfirmation: z.string(),
  })
  .refine((form) => form.password === form.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Las contraseñas no coinciden.',
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

/** Resultado de validar un formulario: los datos limpios o un mensaje por campo. */
export type FormValidation<T> =
  { ok: true; data: T } | { ok: false; fieldErrors: Partial<Record<keyof T, string>> };

function validate<T>(schema: z.ZodType<T>, input: unknown): FormValidation<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<keyof T, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof T;
    // Se muestra el primer problema de cada campo, que es el que el usuario arregla primero.
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}

/** Valida el formulario de inicio de sesión. El correo vuelve sin espacios y en minúsculas. */
export const validateSignIn = (input: unknown) => validate(signInSchema, input);

/** Valida el formulario de registro (nombre, correo, contraseña y su confirmación). */
export const validateSignUp = (input: unknown) => validate(signUpSchema, input);
