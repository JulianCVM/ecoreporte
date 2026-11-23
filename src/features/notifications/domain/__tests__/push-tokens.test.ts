import { storedTokens, withToken } from '../push-tokens';

describe('storedTokens', () => {
  it('lee la lista guardada', () => {
    expect(storedTokens(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('un campo ausente o con otra forma cuenta como lista vacía', () => {
    expect(storedTokens(undefined)).toEqual([]);
    expect(storedTokens('a')).toEqual([]);
    expect(storedTokens(['a', 7])).toEqual([]);
  });
});

describe('withToken', () => {
  it('agrega el token del dispositivo al final', () => {
    expect(withToken(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('no hay nada que guardar si el token ya estaba', () => {
    expect(withToken(['a', 'b'], 'a')).toBeNull();
  });

  it('al pasar del tope de las reglas salen los tokens más viejos', () => {
    expect(withToken(['1', '2', '3', '4', '5'], '6')).toEqual(['2', '3', '4', '5', '6']);
  });
});
