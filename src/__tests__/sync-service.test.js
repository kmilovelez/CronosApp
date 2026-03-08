import syncService from '../services/sync-service';

describe('sync-service', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('syncData hace POST a /sync y retorna json', async () => {
    const payload = { entries: [{ id: 1 }] };
    const responseData = { ok: true };
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(responseData),
    });

    const result = await syncService.syncData(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/sync',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
    expect(result).toEqual(responseData);
  });

  test('syncData lanza error cuando response.ok es false', async () => {
    global.fetch.mockResolvedValue({ ok: false });

    await expect(syncService.syncData({ entries: [] })).rejects.toThrow(
      'Network response was not ok'
    );
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test('fetchData consulta /data y retorna resultado', async () => {
    const data = [{ id: 1, user: 'u1' }];
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(data),
    });

    const result = await syncService.fetchData();

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data');
    expect(result).toEqual(data);
  });

  test('fetchData lanza error cuando falla red', async () => {
    global.fetch.mockRejectedValue(new Error('offline'));

    await expect(syncService.fetchData()).rejects.toThrow('offline');
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
