import {
  calcularDuracion,
  calcularHorasViaje,
  formatDateISO,
  formatTime,
  generateUniqueId,
  reverseGeocode,
} from '../utils/helpers';

describe('helpers', () => {
  test('formatTime convierte segundos a H:MM:SS', () => {
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(59)).toBe('0:00:59');
  });

  test('calcularHorasViaje aplica reglas de vuelo nacional', () => {
    const result = calcularHorasViaje('08:30', '10:00', 'nacional');
    expect(result).toEqual({
      inicio: '06:30',
      fin: '11:00',
      totalHoras: 4.5,
    });
  });

  test('calcularHorasViaje limita a rango 00:00 - 24:00', () => {
    const result = calcularHorasViaje('01:00', '23:30', 'internacional');
    expect(result).toEqual({
      inicio: '00:00',
      fin: '24:00',
      totalHoras: 24,
    });
  });

  test('calcularDuracion maneja cruce de medianoche y almuerzo', () => {
    expect(calcularDuracion('22:00', '02:00')).toBe(4);
    expect(calcularDuracion('08:00', '17:00', true)).toBe(8);
    expect(calcularDuracion('12:30', '13:00', true)).toBe(0);
  });

  test('formatDateISO retorna solo la fecha en formato YYYY-MM-DD', () => {
    const date = new Date('2026-03-07T14:30:00.000Z');
    expect(formatDateISO(date)).toBe('2026-03-07');
  });

  test('generateUniqueId devuelve ids con prefijo "_" y no repetidos', () => {
    const id1 = generateUniqueId();
    const id2 = generateUniqueId();

    expect(id1).toMatch(/^_[a-z0-9]+$/);
    expect(id2).toMatch(/^_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

describe('reverseGeocode', () => {
  test('retorna display_name cuando la API responde correctamente', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ display_name: 'Bogotá, Colombia' }),
    });

    const result = await reverseGeocode(4.711, -74.0721);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toBe('Bogotá, Colombia');
  });

  test('retorna coordenadas fallback cuando fetch falla', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

    const result = await reverseGeocode(4.711, -74.0721);

    expect(result).toBe('4.71100, -74.07210');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
