import { ScreenScaffold } from '@/components/screen-scaffold';
import { SignInForm } from '@/features/auth/ui/sign-in-form';

export default function SignInScreen() {
  return (
    <ScreenScaffold
      title="EcoReporte"
      description="Entra para reportar residuos y seguir tus reportes."
      pending={['Entrar con Google']}>
      <SignInForm />
    </ScreenScaffold>
  );
}
