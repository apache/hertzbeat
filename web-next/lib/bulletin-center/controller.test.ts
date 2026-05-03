import { describe, expect, it, vi } from 'vitest';
import { buildBulletinMetricsUrl, buildBulletinPayload, createBulletin, deleteBulletin, deleteBulletins, loadBulletinData, loadBulletinMetrics, updateBulletin } from './controller';

describe('bulletin controller', () => {
  it('loads bulletin list from current search query', async () => {
    const apiGet = vi.fn().mockResolvedValue({ content: [], totalElements: 0 });

    const result = await loadBulletinData(apiGet as any, 'checkout');

    expect(apiGet).toHaveBeenCalledWith('/bulletin?pageIndex=0&pageSize=8&search=checkout');
    expect(result).toEqual({ list: { content: [], totalElements: 0 } });
  });

  it('builds metrics url for the selected bulletin id', () => {
    expect(buildBulletinMetricsUrl(7)).toBe('/bulletin/metrics?id=7');
  });

  it('loads bulletin metrics for the selected bulletin id', async () => {
    const apiGet = vi.fn().mockResolvedValue({ activeMonitors: 3 });

    const result = await loadBulletinMetrics(apiGet as any, 7);

    expect(apiGet).toHaveBeenCalledWith('/bulletin/metrics?id=7');
    expect(result).toEqual({ activeMonitors: 3 });
  });

  it('builds bulletin payloads from editor drafts', () => {
    expect(
      buildBulletinPayload({
        id: 7,
        name: ' Ops board ',
        app: 'mysql',
        monitorIdsText: '1, 2, 3',
        fieldsJson: '{"cpu":["usage"],"mem":["used"]}'
      })
    ).toEqual({
      id: 7,
      name: 'Ops board',
      app: 'mysql',
      monitorIds: [1, 2, 3],
      fields: { cpu: ['usage'], mem: ['used'] }
    });
  });

  it('creates, updates, and deletes bulletin definitions', async () => {
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    const draft = {
      name: 'Ops board',
      app: 'mysql',
      monitorIdsText: '1,2',
      fieldsJson: '{"cpu":["usage"]}'
    };

    await createBulletin(apiPost as any, draft);
    await updateBulletin(apiPut as any, { ...draft, id: 7 });
    await deleteBulletin(apiDelete as any, 7);
    await deleteBulletins(apiDelete as any, [7, 8]);

    expect(apiPost).toHaveBeenCalledWith('/bulletin', expect.objectContaining({ name: 'Ops board' }));
    expect(apiPut).toHaveBeenCalledWith('/bulletin', expect.objectContaining({ id: 7, name: 'Ops board' }));
    expect(apiDelete).toHaveBeenCalledWith('/bulletin?ids=7');
    expect(apiDelete).toHaveBeenCalledWith('/bulletin?ids=7&ids=8');
  });
});
