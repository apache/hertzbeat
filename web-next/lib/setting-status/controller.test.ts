import { describe, expect, it, vi } from 'vitest';
import { buildStatusIncidentListUrl, createStatusPageComponent, createStatusPageIncident, deleteStatusPageComponent, deleteStatusPageIncident, loadStatusManagementData, saveStatusPageOrg, updateStatusPageComponent, updateStatusPageIncident } from './controller';

describe('setting status controller', () => {
  it('loads org, components and incidents together', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ name: 'HB Status' })
      .mockResolvedValueOnce([{ id: 1, name: 'API' }])
      .mockResolvedValueOnce({ content: [{ id: 2, name: 'Incident A' }], totalElements: 1 });

    const result = await loadStatusManagementData(apiGet as any);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/status/page/org');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/status/page/component');
    expect(apiGet).toHaveBeenNthCalledWith(3, '/status/page/incident?pageIndex=0&pageSize=8');
    expect(result).toEqual({
      org: { name: 'HB Status' },
      components: [{ id: 1, name: 'API' }],
      incidents: { content: [{ id: 2, name: 'Incident A' }], totalElements: 1 }
    });
  });

  it('builds incident list urls with server-side search and paging', () => {
    expect(buildStatusIncidentListUrl()).toBe('/status/page/incident?pageIndex=0&pageSize=8');
    expect(buildStatusIncidentListUrl({ search: '  latency spike  ', pageIndex: 2, pageSize: 15 })).toBe(
      '/status/page/incident?pageIndex=2&pageSize=15&search=latency+spike'
    );
  });

  it('falls back to an empty org when the status page org is not configured yet', async () => {
    const apiGet = vi.fn()
      .mockRejectedValueOnce(new Error('Status Page Organization Not Found'))
      .mockResolvedValueOnce([{ id: 1, name: 'API' }])
      .mockResolvedValueOnce({ content: [{ id: 2, name: 'Incident A' }], totalElements: 1 });

    const result = await loadStatusManagementData(apiGet as any);

    expect(result).toEqual({
      org: {},
      components: [{ id: 1, name: 'API' }],
      incidents: { content: [{ id: 2, name: 'Incident A' }], totalElements: 1 }
    });
  });

  it('rethrows unrelated org lookup failures', async () => {
    const apiGet = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ content: [], totalElements: 0 });

    await expect(loadStatusManagementData(apiGet as any)).rejects.toThrow('boom');
  });

  it('saves the status page org through the existing endpoint', async () => {
    const apiPost = vi.fn().mockResolvedValue({ id: 1, name: 'HB Status' });
    await saveStatusPageOrg(apiPost as any, { id: 1, name: 'HB Status' } as any);
    expect(apiPost).toHaveBeenCalledWith('/status/page/org', { id: 1, name: 'HB Status' });
  });

  it('creates, updates, and deletes status page components', async () => {
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    const component = { id: 7, orgId: 1, name: 'API' };

    await createStatusPageComponent(apiPost as any, component as any);
    await updateStatusPageComponent(apiPut as any, component as any);
    await deleteStatusPageComponent(apiDelete as any, 7);

    expect(apiPost).toHaveBeenCalledWith('/status/page/component', component);
    expect(apiPut).toHaveBeenCalledWith('/status/page/component', component);
    expect(apiDelete).toHaveBeenCalledWith('/status/page/component/7');
  });

  it('creates, updates, and deletes status page incidents', async () => {
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    const incident = { id: 7, orgId: 1, name: 'API degraded' };

    await createStatusPageIncident(apiPost as any, incident as any);
    await updateStatusPageIncident(apiPut as any, incident as any);
    await deleteStatusPageIncident(apiDelete as any, 7);

    expect(apiPost).toHaveBeenCalledWith('/status/page/incident', incident);
    expect(apiPut).toHaveBeenCalledWith('/status/page/incident', incident);
    expect(apiDelete).toHaveBeenCalledWith('/status/page/incident/7');
  });
});
