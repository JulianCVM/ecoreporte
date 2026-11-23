import { Link } from 'expo-router';
import { useState } from 'react';

import { FormError } from '@/components/form-error';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';

import { signUp } from '../data/auth-repository';
import { validateSignUp, type SignUpInput } from '../domain/credentials';
import { PASSWORD_MIN_LENGTH } from '../domain/limits';
import { useAuthSubmit } from './use-auth-submit';

const EMPTY = { displayName: '', email: '', password: '', passwordConfirmation: '' };

/** Registro con nombre, correo y contraseña. Crea la cuenta y el documento `users/{uid}`. */
export function SignUpForm() {
  const [values, setValues] = useState(EMPTY);
  const { fieldErrors, formError, loading, submit } = useAuthSubmit<SignUpInput>(
    validateSignUp,
    signUp,
  );
  const set = (field: keyof typeof values) => (text: string) =>
    setValues((current) => ({ ...current, [field]: text }));

  return (
    <>
      <TextField
        label="Nombre"
        value={values.displayName}
        onChangeText={set('displayName')}
        error={fieldErrors.displayName}
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Correo"
        value={values.email}
        onChangeText={set('email')}
        error={fieldErrors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Contraseña"
        placeholder={`Al menos ${PASSWORD_MIN_LENGTH} caracteres`}
        value={values.password}
        onChangeText={set('password')}
        error={fieldErrors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Repite la contraseña"
        value={values.passwordConfirmation}
        onChangeText={set('passwordConfirmation')}
        error={fieldErrors.passwordConfirmation}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={() => submit(values)}
      />
      <FormError message={formError} />
      <PrimaryButton label="Crear cuenta" loading={loading} onPress={() => submit(values)} />
      <Link href="/iniciar-sesion" accessibilityRole="link">
        <ThemedText type="small" themeColor="primary">
          ¿Ya tienes cuenta? Entra
        </ThemedText>
      </Link>
    </>
  );
}
