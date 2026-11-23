import { notifyOperatorsOfAlert, notifyStatusChange, type TokenStore } from '../notify';
import type { PushMessage } from '../push-message';
import type { PushSender } from '../push-sender';

type Sent = { target: string[] | string; message: PushMessage };

function fakes(options: { tokens?: unknown; stale?: string[] } = {}) {
  const sent: Sent[] = [];
  const removed: { uid: string; tokens: string[] }[] = [];
  const sender: PushSender = {
    sendToTokens: (tokens, message) => {
      sent.push({ target: tokens, message });
      return Promise.resolve({ staleTokens: options.stale ?? [] });
    },
    sendToTopic: (topic, message) => {
      sent.push({ target: topic, message });
      return Promise.resolve();
    },
  };
  const tokens: TokenStore = {
    readTokens: () => Promise.resolve(options.tokens),
    removeTokens: (uid, stale) => {
      removed.push({ uid, tokens: stale });
      return Promise.resolve();
    },
  };
  return { sent, removed, deps: { fcmEnabled: true, sender, tokens } };
}

const report = (status: string) => ({ authorUid: 'ana', status });

describe('notifyStatusChange', () => {
  it('envía el aviso a los tokens del autor', async () => {
    const { sent, deps } = fakes({ tokens: ['t1', 't2'] });
    const result = await notifyStatusChange(
      'r1',
      report('processing_ai'),
      report('approved'),
      deps,
    );
    expect(result).toBe('sent');
    expect(sent).toHaveLength(1);
    expect(sent[0]?.target).toEqual(['t1', 't2']);
    expect(sent[0]?.message.data.status).toBe('approved');
  });

  it('con FCM_ENABLED=false no lee tokens ni envía', async () => {
    const { sent, deps } = fakes({ tokens: ['t1'] });
    const result = await notifyStatusChange('r1', report('processing_ai'), report('approved'), {
      ...deps,
      fcmEnabled: false,
    });
    expect(result).toBe('disabled');
    expect(sent).toHaveLength(0);
  });

  it('sin tokens no falla ni envía', async () => {
    for (const tokens of [undefined, [], 'no-es-una-lista']) {
      const { sent, deps } = fakes({ tokens });
      const result = await notifyStatusChange('r1', report('approved'), report('resolved'), deps);
      expect(result).toBe('no_tokens');
      expect(sent).toHaveLength(0);
    }
  });

  it('no avisa cuando el estado no cambió o es intermedio', async () => {
    const { sent, deps } = fakes({ tokens: ['t1'] });
    expect(await notifyStatusChange('r1', report('approved'), report('approved'), deps)).toBe(
      'not_notifiable',
    );
    expect(
      await notifyStatusChange('r1', report('pending_upload'), report('processing_ai'), deps),
    ).toBe('not_notifiable');
    expect(sent).toHaveLength(0);
  });

  it('borra del usuario los tokens que FCM ya no reconoce', async () => {
    const { removed, deps } = fakes({ tokens: ['vivo', 'viejo'], stale: ['viejo'] });
    await notifyStatusChange('r1', report('approved'), report('in_progress'), deps);
    expect(removed).toEqual([{ uid: 'ana', tokens: ['viejo'] }]);
  });

  it('no envía a más tokens que el tope por usuario', async () => {
    const { sent, deps } = fakes({ tokens: ['1', '2', '3', '4', '5', '6', '7'] });
    await notifyStatusChange('r1', report('approved'), report('resolved'), deps);
    expect(sent[0]?.target).toHaveLength(5);
  });

  it('un reporte sin autor no se avisa', async () => {
    const { sent, deps } = fakes({ tokens: ['t1'] });
    const result = await notifyStatusChange('r1', report('approved'), { status: 'resolved' }, deps);
    expect(result).toBe('not_notifiable');
    expect(sent).toHaveLength(0);
  });
});

describe('notifyOperatorsOfAlert', () => {
  const alert = { reportId: 'r1', category: 'escombros', complexity: 'alta' };

  it('envía la alerta al tema de los operadores', async () => {
    const { sent, deps } = fakes();
    expect(await notifyOperatorsOfAlert(alert, deps)).toBe('sent');
    expect(sent[0]?.target).toBe('operators');
  });

  it('con FCM_ENABLED=false no envía', async () => {
    const { sent, deps } = fakes();
    expect(await notifyOperatorsOfAlert(alert, { ...deps, fcmEnabled: false })).toBe('disabled');
    expect(sent).toHaveLength(0);
  });

  it('una alerta sin reporte no se envía', async () => {
    const { sent, deps } = fakes();
    expect(await notifyOperatorsOfAlert({ category: 'escombros' }, deps)).toBe('not_notifiable');
    expect(sent).toHaveLength(0);
  });
});
