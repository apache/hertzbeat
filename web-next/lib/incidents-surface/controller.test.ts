import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  buildIncidentStatusTransitionPayload,
  buildIncidentWorkbenchData,
  INCIDENT_WORKBENCH_DEFAULT_QUERY,
  loadIncidentWorkbenchData,
  readIncidentWorkbenchQuery,
  transitionIncidentStatus
} from './controller';

const t = createTranslatorMock({ locale: 'en-US' });
const formatTime = (value?: number | string | null) => (value == null ? '-' : `time:${value}`);

describe('incidents surface controller', () => {
  it('loads the shared incident workbench from the status-page incident list endpoint', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({
        content: [
          {
            id: 42,
            title: 'API latency incident',
            state: 0,
            startTime: 1712730000000,
            creator: 'platform-oncall',
            components: [{ id: 7, name: 'api-gateway' }]
          }
        ],
        totalElements: 3,
        pageIndex: 0,
        pageSize: 8
      })
      .mockResolvedValueOnce({
        id: 42,
        name: 'API latency incident detail',
        state: 1,
        startTime: 1712730000000,
        modifier: 'detail-responder',
        components: [{ id: 7, name: 'api-gateway' }, { id: 8, name: 'checkout' }],
        contents: [{ id: 8, state: 1, message: 'Rollback started from detail endpoint', timestamp: 1712730300000 }]
      });

    const result = await loadIncidentWorkbenchData(apiGet as any, t, formatTime, INCIDENT_WORKBENCH_DEFAULT_QUERY);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/status/page/incident?pageIndex=0&pageSize=8');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/status/page/incident/42');
    expect(result).toMatchObject({
      apiState: 'ready',
      apiSource: 'status-page-incident-list',
      detailState: 'ready',
      detailSource: 'status-page-incident-detail',
      detailId: '42',
      queryLabel: '/status/page/incident?pageIndex=0&pageSize=8',
      title: 'Incidents',
      kicker: 'Incident response desk',
      totalElements: 3,
      selectedIncidentId: '42',
      transitionState: 'ready'
    });
    expect(result.selectedIncident).toMatchObject({
      id: 42,
      name: 'API latency incident detail',
      state: 1
    });
    expect(result.metrics).toEqual([
      { label: 'Open incidents', value: '3', tone: 'warning' },
      { label: 'Critical', value: '0', tone: 'success' },
      { label: 'Mitigating', value: '1', tone: 'info' },
      { label: 'Ownership queues', value: '1', tone: 'info' }
    ]);
    expect(result.incidents[0]).toMatchObject({
      id: '42',
      title: 'API latency incident detail',
      severity: 'warning',
      severityLabel: 'Warning',
      stage: 'Identified',
      service: 'api-gateway',
      owner: 'detail-responder',
      openedAt: 'time:1712730000000',
      blastRadius: '2 Components'
    });
    expect(result.timelineRows[0]).toMatchObject({
      id: 'incident-timeline-42-8',
      title: 'time:1712730300000 · Identified',
      copy: 'Rollback started from detail endpoint',
      meta: 'API latency incident detail',
      tone: 'warning'
    });
    expect(result.ownershipRows[0]).toMatchObject({
      id: 'incident-owner-42',
      owner: 'detail-responder',
      queue: 'Identified',
      copy: 'API latency incident detail'
    });
  });

  it('keeps the workbench empty state API-backed without falling back to fixture incidents', () => {
    const result = buildIncidentWorkbenchData(
      { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 },
      t,
      formatTime
    );

    expect(result.apiState).toBe('empty');
    expect(result.detailState).toBe('not-requested');
    expect(result.detailSource).toBe('none');
    expect(result.selectedIncident).toBeNull();
    expect(result.transitionState).toBe('disabled');
    expect(result.incidents).toEqual([]);
    expect(result.timelineRows).toEqual([]);
    expect(result.ownershipRows).toEqual([]);
    expect(result.metrics.map(metric => metric.value)).toEqual(['0', '0', '0', '0']);
  });

  it('normalizes inverted incident timelines before building table and ownership timestamps', () => {
    const result = buildIncidentWorkbenchData(
      {
        content: [
          {
            id: 12,
            name: 'Archive incident',
            state: 2,
            startTime: new Date('2026-04-22T09:53:41.157Z').getTime(),
            endTime: new Date('2025-02-12T02:45:00.000Z').getTime(),
            gmtCreate: '2026-04-22T17:53:41.158081',
            gmtUpdate: '2026-04-22T17:53:41.158081',
            components: [{ id: 1, name: 'api-gateway' }],
            contents: [
              {
                id: 25,
                message: 'Historical latency spike was traced to a downstream dependency.',
                state: 0,
                timestamp: new Date('2025-02-12T01:35:00.000Z').getTime()
              },
              {
                id: 26,
                message: 'Service recovered after the retry policy was tuned.',
                state: 3,
                timestamp: new Date('2025-02-12T02:45:00.000Z').getTime()
              }
            ]
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      },
      t,
      formatTime
    );

    expect(result.incidents[0].openedAt).toBe(`time:${new Date('2025-02-12T01:35:00.000Z').getTime()}`);
    expect(result.ownershipRows[0].meta).toContain(`time:${new Date('2025-02-12T01:35:00.000Z').getTime()}`);
    expect(result.timelineRows.map(row => row.title)).toEqual([
      `time:${new Date('2025-02-12T02:45:00.000Z').getTime()} · Resolved`,
      `time:${new Date('2025-02-12T01:35:00.000Z').getTime()} · Investigating`
    ]);
    expect(result.selectedIncident).toMatchObject({
      id: 12,
      createTime: new Date('2025-02-12T01:35:00.000Z').getTime(),
      updateTime: new Date('2025-02-12T02:45:00.000Z').getTime()
    });
  });

  it('does not request detail when the incident list is empty', async () => {
    const apiGet = vi.fn().mockResolvedValueOnce({ content: [], totalElements: 0, pageIndex: 0, pageSize: 8 });

    const result = await loadIncidentWorkbenchData(apiGet as any, t, formatTime);

    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith('/status/page/incident?pageIndex=0&pageSize=8');
    expect(result).toMatchObject({
      apiState: 'empty',
      detailState: 'not-requested',
      detailSource: 'none',
      transitionState: 'disabled'
    });
  });

  it('reads Angular incident search and server-side pagination params from the route query', () => {
    expect(readIncidentWorkbenchQuery({
      search: ' api latency ',
      pageIndex: '2',
      pageSize: '15'
    })).toEqual({
      search: ' api latency ',
      pageIndex: 2,
      pageSize: 15
    });
    expect(readIncidentWorkbenchQuery({
      search: ['checkout', 'ignored'],
      pageIndex: 'not-a-number',
      pageSize: ''
    })).toEqual({
      search: 'checkout',
      pageIndex: 0,
      pageSize: 8
    });
  });

  it('builds and sends a status transition payload through the existing status-page PUT contract', async () => {
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const incident = {
      id: 42,
      name: 'API latency incident',
      state: 1,
      orgId: 3,
      components: [{ id: 7, name: 'api-gateway' }],
      contents: [{ id: 8, incidentId: 42, message: 'Identified bad deploy', state: 1, timestamp: 1000 }]
    };

    const payload = buildIncidentStatusTransitionPayload(
      incident,
      2,
      'Monitoring after rollback',
      2000
    );

    expect(payload).toMatchObject({
      id: 42,
      name: 'API latency incident',
      state: 2,
      orgId: 3,
      components: [{ id: 7, name: 'api-gateway' }],
      contents: [
        { id: 8, incidentId: 42, message: 'Identified bad deploy', state: 1, timestamp: 1000 },
        { incidentId: 42, message: 'Monitoring after rollback', state: 2, timestamp: 2000 }
      ]
    });

    await transitionIncidentStatus(apiPut as any, incident, 3, 'Resolved from incidents workbench', 3000);

    expect(apiPut).toHaveBeenCalledWith('/status/page/incident', {
      ...incident,
      state: 3,
      contents: [
        { id: 8, incidentId: 42, message: 'Identified bad deploy', state: 1, timestamp: 1000 },
        { incidentId: 42, message: 'Resolved from incidents workbench', state: 3, timestamp: 3000 }
      ]
    });
  });
});
