import { Link } from 'expo-router';
import { useState } from 'react';

import { FormError } from '@/components/form-error';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';

import { signIn } from '../data/auth-repository';
import { validateSignIn, type SignInInput } from '../domain/credentials';
import { useAuthSubmit } from './use-auth-submit';

/** Inicio de sesión con correo y contraseña. Al entrar, la guarda de rutas abre las pestañas. */
export function SignInForm() {
  const [values, setValues] = useState({ email: '', password: '' });
  const { fieldErrors, formError, loading, submit } = useAuthSubmit<SignInInput>(
    validateSignIn,
    signIn,
  );
  const set = (field: keyof typeof values) => (text: string) =>
    setValues((current) => ({ ...current, [field]: text }));

  return (
    <>
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
        value={values.password}
        onChangeText={set('password')}
        error={fieldErrors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => submit(values)}
      />
      <FormError message={formError} />
      <PrimaryButton label="Entrar" loading={loading} onPress={() => submit(values)} />
      <Link href="/crear-cuenta" accessibilityRole="link">
        <ThemedText type="small" themeColor="primary">
          ¿No tienes cuenta? Crea una
        </ThemedText>
      </Link>
    </>
  );
}
