import firebaseJson from '../../../../firebase.json';
import { EMULATOR_PORTS, emulatorTargets } from '../emulators';

const base = { env: 'local', useEmulators: true, emulatorHost: '10.0.2.2' } as const;

describe('emulatorTargets', () => {
  it('apunta al PC desde el emulador de Android', () => {
    expect(emulatorTargets(base)).toEqual({
      authUrl: 'http://10.0.2.2:9099',
      host: '10.0.2.2',
      ports: EMULATOR_PORTS,
    });
  });

  it('respeta otro host (teléfono físico en la misma red)', () => {
    expect(emulatorTargets({ ...base, emulatorHost: '192.168.1.20' })?.authUrl).toBe(
      'http://192.168.1.20:9099',
    );
  });

  it('no conecta si los emuladores están apagados', () => {
    expect(emulatorTargets({ ...base, useEmulators: false })).toBeNull();
  });

  it('nunca conecta en prod, aunque la bandera esté encendida', () => {
    expect(emulatorTargets({ ...base, env: 'prod' })).toBeNull();
  });

  it('usa los mismos puertos que firebase.json', () => {
    const { auth, firestore, storage, functions } = firebaseJson.emulators;
    expect(EMULATOR_PORTS).toEqual({
      auth: auth.port,
      firestore: firestore.port,
      storage: storage.port,
      functions: functions.port,
    });
  });
});
