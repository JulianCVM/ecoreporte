import { photoOrigin } from '../report-photo';

describe('photoOrigin', () => {
  it('mientras la foto está en la cola usa la copia del teléfono', () => {
    expect(photoOrigin('pending_upload', true)).toBe('local');
  });

  it('una foto ya subida se lee de Storage', () => {
    expect(photoOrigin('processing_ai', false)).toBe('remote');
    expect(photoOrigin('approved', false)).toBe('remote');
    expect(photoOrigin('rejected', false)).toBe('remote');
  });

  it('un reporte pendiente sin copia local o cancelado no tiene foto que mostrar', () => {
    expect(photoOrigin('pending_upload', false)).toBe('none');
    expect(photoOrigin('cancelled', false)).toBe('none');
  });
});
