import { useState } from 'react';

import { AuthActionError } from '../data/auth-repository';
import type { FormValidation } from '../domain/credentials';

/**
 * Estado común de los formularios de cuenta: valida con el dominio, llama a la acción y guarda
 * los errores por campo y el error general (ya en español) para mostrarlos.
 */
export function useAuthSubmit<T>(
  validate: (input: unknown) => FormValidation<T>,
  action: (data: T) => Promise<void>,
) {
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(input: unknown) {
    if (loading) return;
    const result = validate(input);
    setFormError(null);
    if (!result.ok) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await action(result.data);
    } catch (error) {
      // El repositorio ya tradujo y registró el error; aquí solo se muestra.
      setFormError(error instanceof AuthActionError ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return { fieldErrors, formError, loading, submit };
}
