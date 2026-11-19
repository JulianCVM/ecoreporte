import { resolveGoogleServicesFile } from '../app.config';

describe('resolveGoogleServicesFile', () => {
  const exists = (files: string[]) => (file: string) => files.includes(file);

  it('usa ecoreporte-dev en development y preview', () => {
    const has = exists(['./google-services.json']);
    expect(resolveGoogleServicesFile('development', {}, has)).toBe('./google-services.json');
    expect(resolveGoogleServicesFile('preview', {}, has)).toBe('./google-services.json');
  });

  it('en production espera el archivo de ecoreporte-prod, no el de dev', () => {
    expect(
      resolveGoogleServicesFile('production', {}, exists(['./google-services.json'])),
    ).toBeUndefined();
    expect(
      resolveGoogleServicesFile('production', {}, exists(['./google-services.prod.json'])),
    ).toBe('./google-services.prod.json');
  });

  it('GOOGLE_SERVICES_JSON reemplaza la ruta por defecto', () => {
    const env = { GOOGLE_SERVICES_JSON: '/tmp/gs.json' };
    expect(resolveGoogleServicesFile('development', env, exists(['/tmp/gs.json']))).toBe(
      '/tmp/gs.json',
    );
  });

  it('sin archivo devuelve undefined para que lint, pruebas y CI no lo necesiten', () => {
    expect(resolveGoogleServicesFile('development', {}, exists([]))).toBeUndefined();
  });
});
