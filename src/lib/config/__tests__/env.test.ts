import { parseEnv } from '../env';

describe('parseEnv', () => {
  it('aplica los valores por defecto cuando no hay nada', () => {
    expect(parseEnv({})).toEqual({
      env: 'local',
      useEmulators: false,
      emulatorHost: '10.0.2.2',
      appCheckDebugToken: undefined,
      mapStyleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    });
  });

  it('acepta otro estilo de mapa y rechaza uno que no es una URL', () => {
    const url = 'https://example.com/estilo.json';
    expect(parseEnv({ EXPO_PUBLIC_MAP_STYLE_URL: url }).mapStyleUrl).toBe(url);
    expect(() => parseEnv({ EXPO_PUBLIC_MAP_STYLE_URL: 'liberty' })).toThrow(/MAP_STYLE_URL/);
  });

  it('trata las variables vacías como ausentes', () => {
    expect(parseEnv({ EXPO_PUBLIC_EMULATOR_HOST: '' }).emulatorHost).toBe('10.0.2.2');
  });

  it('convierte los booleanos escritos como texto', () => {
    expect(parseEnv({ EXPO_PUBLIC_USE_EMULATORS: 'true' }).useEmulators).toBe(true);
    expect(parseEnv({ EXPO_PUBLIC_USE_EMULATORS: 'false' }).useEmulators).toBe(false);
  });

  it('rechaza un entorno desconocido', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_ENV: 'staging' })).toThrow(/EXPO_PUBLIC_ENV/);
  });

  it('no deja que prod apunte a los emuladores', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_ENV: 'prod', EXPO_PUBLIC_USE_EMULATORS: 'true' })).toThrow(
      /prod no puede usar emuladores/,
    );
  });
});
