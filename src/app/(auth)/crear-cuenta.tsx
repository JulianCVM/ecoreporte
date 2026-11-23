import { BrandMark } from '@/components/brand-mark';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { SignUpForm } from '@/features/auth/ui/sign-up-form';

export default function SignUpScreen() {
  return (
    <ScreenScaffold
      header={<BrandMark />}
      title="Crear cuenta"
      description="Con tu cuenta puedes seguir cada reporte.">
      <SignUpForm />
    </ScreenScaffold>
  );
}
