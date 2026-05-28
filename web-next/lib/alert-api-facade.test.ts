import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './alert-api-facade';

const fetchMock = vi.fn<typeof fetch>();

function mockApiMessagePayload(data: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ code: 0, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

describe('alert api facade', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('maps alert center reads and group mutations through the alert facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ total: 4, priorityCriticalNum: 1 });
    mockApiMessagePayload({ content: [{ id: 9, content: 'checkout down' }], totalElements: 1, pageIndex: 0, pageSize: 8 });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    await expect(api.alerts.summary()).resolves.toEqual({ total: 4, priorityCriticalNum: 1 });
    await expect(
      api.alerts.groupAlerts({
        search: ' checkout ',
        status: ' firing ',
        severity: ' critical ',
        pageIndex: 0,
        pageSize: 8,
        entityId: '',
        entityName: '',
        returnTo: ''
      })
    ).resolves.toEqual({
      content: [{ id: 9, content: 'checkout down' }],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    });
    await expect(api.alerts.groupStatus('acknowledged', [7, 8])).resolves.toBeUndefined();
    await expect(api.alerts.groupClose(7)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alerts/summary',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&status=firing&severity=critical',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/alerts/group/status/acknowledged?ids=7&ids=8',
      expect.objectContaining({ method: 'PUT', credentials: 'same-origin', body: 'null' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/alerts/group?ids=7',
      expect.objectContaining({ method: 'DELETE', credentials: 'same-origin' })
    );
  });

  it('maps alert setting reads and mutations through the alert facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ mysql: 'MySQL database' });
    mockApiMessagePayload({ content: [{ id: 7, name: 'cpu threshold' }], totalElements: 1 });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 0, data: { promql: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    mockApiMessagePayload({ id: 7, name: 'cpu threshold' });
    mockApiMessagePayload({ id: 8 });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    await expect(api.alertSettings.appDefines('en_US')).resolves.toEqual({ mysql: 'MySQL database' });
    await expect(api.alertSettings.list('mysql', 0, 8, [{ key: 'mysql', value: 'MySQL database' }])).resolves.toEqual({
      content: [{ id: 7, name: 'cpu threshold' }],
      totalElements: 1
    });
    await expect(api.alertSettings.datasourceStatus()).resolves.toEqual({ code: 0, data: { promql: true } });
    await expect(api.alertSettings.detail(7)).resolves.toEqual({ id: 7, name: 'cpu threshold' });
    await expect(api.alertSettings.create({ name: 'memory threshold' })).resolves.toEqual({ id: 8 });
    await expect(api.alertSettings.update({ id: 7, enable: false })).resolves.toBeUndefined();
    await expect(api.alertSettings.delete([7, 8])).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc&search=%5B%22mysql%22%5D',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      '/api/alert/defines?ids=7&ids=8',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('maps alert notice lists, options, details, and mutations through the alert facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ content: [{ id: 7, name: 'Ops email' }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 8, name: 'All receiver' }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 5, name: 'Critical rule' }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 9, name: 'Email template', preset: false }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 10, name: 'Default template', preset: true }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 11, name: 'Custom template', preset: false }], totalElements: 1 });
    mockApiMessagePayload({ id: 7, name: 'Ops email' });
    mockApiMessagePayload({ ok: true });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);
    mockApiMessagePayload({ id: 5, name: 'Critical rule' });
    mockApiMessagePayload({ ok: true });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);
    mockApiMessagePayload({ id: 9, name: 'Email template' });
    mockApiMessagePayload({ ok: true });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    const receiverDraft = { id: 7, name: ' Ops email ', type: '1', email: ' ops@example.com ', hookAuthType: 'None' } as any;
    const ruleDraft = {
      id: 5,
      name: ' Critical rule ',
      receiverIdsText: '7',
      templateId: '9',
      enable: true,
      filterAll: true,
      labelsText: '',
      daysText: '1,2,3,4,5,6,7',
      periodStart: '09:00',
      periodEnd: '18:00'
    } as any;
    const templateDraft = { id: 9, name: ' Email template ', type: '1', preset: false, content: 'body' } as any;

    await expect(api.alertNotice.receivers.list({ search: 'ops', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 7, name: 'Ops email' }],
      totalElements: 1
    });
    await expect(api.alertNotice.receivers.options()).resolves.toEqual({
      content: [{ id: 8, name: 'All receiver' }],
      totalElements: 1
    });
    await expect(api.alertNotice.rules.list({ search: 'critical', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 5, name: 'Critical rule' }],
      totalElements: 1
    });
    await expect(api.alertNotice.templates.list({ search: 'email', preset: false, pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 9, name: 'Email template', preset: false }],
      totalElements: 1
    });
    await expect(api.alertNotice.templates.options()).resolves.toMatchObject({
      content: [
        { id: 10, name: 'Default template', preset: true },
        { id: 11, name: 'Custom template', preset: false }
      ],
      totalElements: 2
    });
    await expect(api.alertNotice.receivers.detail(7)).resolves.toEqual({ id: 7, name: 'Ops email' });
    await expect(api.alertNotice.receivers.create(receiverDraft)).resolves.toEqual({ ok: true });
    await expect(api.alertNotice.receivers.update(receiverDraft)).resolves.toBeUndefined();
    await expect(api.alertNotice.receivers.sendTest(receiverDraft)).resolves.toBeUndefined();
    await expect(api.alertNotice.receivers.delete(7)).resolves.toBeUndefined();
    await expect(api.alertNotice.rules.detail(5)).resolves.toEqual({ id: 5, name: 'Critical rule' });
    await expect(api.alertNotice.rules.create(ruleDraft, { receiverName: ['Ops email'], templateName: 'Email template' })).resolves.toEqual({ ok: true });
    await expect(api.alertNotice.rules.update(ruleDraft)).resolves.toBeUndefined();
    await expect(api.alertNotice.rules.delete(5)).resolves.toBeUndefined();
    await expect(api.alertNotice.templates.detail(9)).resolves.toEqual({ id: 9, name: 'Email template' });
    await expect(api.alertNotice.templates.create(templateDraft)).resolves.toEqual({ ok: true });
    await expect(api.alertNotice.templates.update(templateDraft)).resolves.toBeUndefined();
    await expect(api.alertNotice.templates.delete(9)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/notice/receivers?pageIndex=0&pageSize=8&name=ops',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      13,
      '/api/notice/rule',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"receiverName":["Ops email"]') })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      17,
      '/api/notice/template',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"preset":false') })
    );
  });

  it('maps alert group, inhibit, silence, label, and entity alert helpers through the alert facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ content: [{ id: 7, name: 'ops group' }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 3, name: 'severity', tagValue: 'critical' }], totalElements: 1 });
    mockApiMessagePayload({ id: 7, name: 'ops group' });
    mockApiMessagePayload({ id: 8 });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);
    mockApiMessagePayload({ content: [{ id: 9, labels: { service: 'checkout' } }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 10, name: 'db inhibit' }], totalElements: 1 });
    mockApiMessagePayload({ id: 10, name: 'db inhibit' });
    mockApiMessagePayload({ id: 11 });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);
    mockApiMessagePayload({ content: [{ id: 12, name: 'weekday silence' }], totalElements: 1 });
    mockApiMessagePayload({ id: 12, name: 'weekday silence' });
    mockApiMessagePayload({ id: 13 });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    await expect(api.alertGroups.list({ search: 'ops', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 7, name: 'ops group' }],
      totalElements: 1
    });
    await expect(api.alertLabels.list()).resolves.toEqual({
      content: [{ id: 3, name: 'severity', tagValue: 'critical' }],
      totalElements: 1
    });
    await expect(api.alertGroups.detail(7)).resolves.toEqual({ id: 7, name: 'ops group' });
    await expect(api.alertGroups.create({ name: 'new group' })).resolves.toEqual({ id: 8 });
    await expect(api.alertGroups.update({ id: 7, enable: false })).resolves.toBeUndefined();
    await expect(api.alertGroups.delete([7, 8])).resolves.toBeUndefined();
    await expect(api.entities.alerts(123, { pageIndex: 0, pageSize: 20, status: 'firing' })).resolves.toEqual({
      content: [{ id: 9, labels: { service: 'checkout' } }],
      totalElements: 1
    });
    await expect(api.alertInhibits.list({ search: 'db', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 10, name: 'db inhibit' }],
      totalElements: 1
    });
    await expect(api.alertInhibits.detail(10)).resolves.toEqual({ id: 10, name: 'db inhibit' });
    await expect(api.alertInhibits.create({ name: 'new inhibit' })).resolves.toEqual({ id: 11 });
    await expect(api.alertInhibits.update({ id: 10, enable: false })).resolves.toBeUndefined();
    await expect(api.alertInhibits.delete([10, 11])).resolves.toBeUndefined();
    await expect(api.alertSilences.list({ search: 'weekday', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 12, name: 'weekday silence' }],
      totalElements: 1
    });
    await expect(api.alertSilences.detail(12)).resolves.toEqual({ id: 12, name: 'weekday silence' });
    await expect(api.alertSilences.create({ name: 'new silence' })).resolves.toEqual({ id: 13 });
    await expect(api.alertSilences.update({ id: 12, enable: false })).resolves.toBeUndefined();
    await expect(api.alertSilences.delete([12, 13])).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      '/api/entities/123/alerts?pageIndex=0&pageSize=20&status=firing',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      12,
      '/api/alert/inhibits?ids=10&ids=11',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      17,
      '/api/alert/silences?ids=12&ids=13',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
