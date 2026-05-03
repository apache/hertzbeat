import { describe, expect, it, vi } from 'vitest';
import { buildAlertGroupDeleteUrl, buildAlertGroupDetailUrl, buildAlertGroupPayload, createAlertGroup, deleteAlertGroup, deleteAlertGroups, loadAlertGroupDetail, updateAlertGroup } from './controller';

describe('alert group controller', () => {
  it('builds detail and delete urls', () => {
    expect(buildAlertGroupDetailUrl(7)).toBe('/alert/group/7');
    expect(buildAlertGroupDeleteUrl(7)).toBe('/alert/groups?ids=7');
    expect(buildAlertGroupDeleteUrl([7, 8])).toBe('/alert/groups?ids=7&ids=8');
  });

  it('loads alert group detail', async () => {
    const apiGet = vi.fn().mockResolvedValue({ id: 7, name: 'ops' });

    await expect(loadAlertGroupDetail(apiGet as any, 7)).resolves.toEqual({ id: 7, name: 'ops' });
    expect(apiGet).toHaveBeenCalledWith('/alert/group/7');
  });

  it('builds payload from form draft', () => {
    expect(
      buildAlertGroupPayload({
        id: 7,
        name: ' Ops ',
        enable: true,
        groupLabelsText: 'alertname, severity , service',
        groupWait: '30',
        groupInterval: '300',
        repeatInterval: '14400',
      })
    ).toEqual({
      id: 7,
      name: 'Ops',
      enable: true,
      groupLabels: ['alertname', 'severity', 'service'],
      groupWait: 30,
      groupInterval: 300,
      repeatInterval: 14400,
    });
  });

  it('creates and updates through the existing endpoint', async () => {
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const draft = {
      name: 'Ops',
      enable: true,
      groupLabelsText: 'alertname',
      groupWait: '30',
      groupInterval: '300',
      repeatInterval: '14400',
    };

    await createAlertGroup(apiPost as any, draft);
    await updateAlertGroup(apiPut as any, { ...draft, id: 7 });

    expect(apiPost).toHaveBeenCalledWith('/alert/group', expect.objectContaining({ name: 'Ops' }));
    expect(apiPut).toHaveBeenCalledWith('/alert/group', expect.objectContaining({ id: 7, name: 'Ops' }));
  });

  it('deletes alert groups through the bulk-delete endpoint', async () => {
    const apiDelete = vi.fn().mockResolvedValue(undefined);

    await deleteAlertGroup(apiDelete as any, 7);

    expect(apiDelete).toHaveBeenCalledWith('/alert/groups?ids=7');
  });

  it('deletes multiple alert groups through the bulk-delete endpoint', async () => {
    const apiDelete = vi.fn().mockResolvedValue(undefined);

    await deleteAlertGroups(apiDelete as any, [7, 8]);

    expect(apiDelete).toHaveBeenCalledWith('/alert/groups?ids=7&ids=8');
  });
});
