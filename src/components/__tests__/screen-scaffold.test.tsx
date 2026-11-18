import { render, screen } from '@testing-library/react-native';

import { ScreenScaffold } from '../screen-scaffold';

describe('ScreenScaffold', () => {
  it('muestra el título como encabezado y la lista de pendientes', async () => {
    await render(
      <ScreenScaffold title="Mapa" description="Reportes cercanos" pending={['RF05 · Mapa']} />,
    );

    expect(screen.getByRole('header', { name: 'Mapa' })).toBeOnTheScreen();
    expect(screen.getByText('Reportes cercanos')).toBeOnTheScreen();
    expect(screen.getByText('En construcción')).toBeOnTheScreen();
    expect(screen.getByText('• RF05 · Mapa')).toBeOnTheScreen();
  });

  it('no muestra el bloque de pendientes cuando no hay', async () => {
    await render(<ScreenScaffold title="Perfil" />);

    expect(screen.queryByText('En construcción')).toBeNull();
  });
});
