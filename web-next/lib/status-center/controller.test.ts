import { describe, expect, it, vi } from 'vitest';
import {
  buildPublicStatusCompatRouteUrl,
  buildStatusIncidentListUrl,
  buildStatusIncidentYearQuery,
  describeStatusIncidentLoadFailure,
  loadStatusPageData,
  loadStatusPageIncidentFeed,
  loadStatusPageIncidents
} from './controller';

describe('status center controller', () => {
  it('builds the public status compatibility alias URL while preserving status filters', () => {
    expect(buildPublicStatusCompatRouteUrl()).toBe('/status');
    expect(
      buildPublicStatusCompatRouteUrl({
        component: 'api',
        status: 'down',
        year: '2026',
        returnTo: '/overview',
        returnLabel: 'Overview'
      })
    ).toBe('/status?component=api&status=down&year=2026&returnTo=%2Foverview');
  });

  it('builds public incident urls with search and range params', () => {
    expect(
      buildStatusIncidentListUrl({
        search: '  latency spike  ',
        startTime: 10,
        endTime: 20,
        pageIndex: 2,
        pageSize: 15
      })
    ).toBe('/status/page/public/incident?pageIndex=2&pageSize=15&search=latency+spike&startTime=10&endTime=20');
  });

  it('builds year-based incident ranges', () => {
    expect(buildStatusIncidentYearQuery(2025, new Date('2026-04-17T00:00:00Z'))).toEqual({
      startTime: new Date(2025, 0, 1).getTime(),
      endTime: new Date(2025, 11, 31, 23, 59, 59, 999).getTime()
    });

    expect(buildStatusIncidentYearQuery(2026, new Date('2026-04-17T00:00:00Z'))).toEqual({
      startTime: new Date(2026, 0, 1).getTime()
    });
  });

  it('loads org, components and incidents together while normalizing public payloads', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({ name: 'OpenStatus' })
      .mockResolvedValueOnce([
        {
          info: { id: 1, name: 'api', state: 1, gmtUpdate: 20 },
          history: [
            { timestamp: 10, state: 1, uptime: 0.82, abnormal: 10, normal: 2, unknowing: 1 },
            { timestamp: 30, state: 0, uptime: 0.95, abnormal: 1, normal: 8, unknowing: 0 }
          ]
        }
      ])
      .mockResolvedValueOnce({
        content: [
          {
            id: 2,
            name: 'incident-1',
            state: 2,
            gmtCreate: 5,
            contents: [
              { message: 'Resolved', state: 3, timestamp: 50 },
              { message: 'Investigating', state: 0, timestamp: 40 }
            ]
          }
        ]
      });

    const result = await loadStatusPageData(apiGet as any, {
      search: 'latency spike',
      startTime: 123,
      endTime: 456,
      pageIndex: 2,
      pageSize: 15
    });

    expect(apiGet).toHaveBeenNthCalledWith(1, '/status/page/public/org');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/status/page/public/component');
    expect(apiGet).toHaveBeenNthCalledWith(
      3,
      '/status/page/public/incident?pageIndex=2&pageSize=15&search=latency+spike&startTime=123&endTime=456'
    );
    expect(result).toEqual({
      org: { name: 'OpenStatus' },
      components: [
        {
          id: 1,
          name: 'api',
          state: 1,
          status: 1,
          gmtUpdate: 20,
          history: [
            { timestamp: 30, state: 0, uptime: 0.95, abnormal: 1, normal: 8, unknowing: 0 },
            { timestamp: 10, state: 1, uptime: 0.82, abnormal: 10, normal: 2, unknowing: 1 }
          ],
          latestTime: 30
        }
      ],
      incidents: [
        {
          id: 2,
          name: 'incident-1',
          title: 'incident-1',
          state: 2,
          status: 2,
          gmtCreate: 5,
          createTime: 5,
          updateTime: 50,
          contents: [
            { message: 'Investigating', state: 0, timestamp: 40 },
            { message: 'Resolved', state: 3, timestamp: 50 }
          ]
        }
      ],
      incidentsError: null
    });
  });

  it('loads incident pages directly with the public query contract', async () => {
    const apiGet = vi.fn().mockResolvedValueOnce({ content: [] });

    await loadStatusPageIncidents(apiGet as any, {
      search: 'database',
      startTime: 100,
      endTime: 200,
      pageIndex: 1,
      pageSize: 8
    });

    expect(apiGet).toHaveBeenCalledWith(
      '/status/page/public/incident?pageIndex=1&pageSize=8&search=database&startTime=100&endTime=200'
    );
  });

  it('keeps the current year feed on first render without re-hitting the backend', async () => {
    const apiGet = vi.fn();
    const currentFeed = [{ id: 1, title: 'Current year incident' }];

    await expect(
      loadStatusPageIncidentFeed(apiGet as any, {
        selectedYear: 2026,
        currentYear: 2026,
        reloadToken: 0,
        initialIncidents: currentFeed as any
      })
    ).resolves.toEqual(currentFeed);

    expect(apiGet).not.toHaveBeenCalled();
  });

  it('refetches the current year feed when refresh is requested', async () => {
    const apiGet = vi.fn().mockResolvedValueOnce({
      content: [
        {
          id: 2,
          name: 'Refreshed incident',
          state: 2,
          startTime: 40,
          contents: [
            { message: 'Monitoring', state: 2, timestamp: 50 },
            { message: 'Investigating', state: 0, timestamp: 45 }
          ]
        }
      ]
    });

    await expect(
      loadStatusPageIncidentFeed(apiGet as any, {
        selectedYear: 2026,
        currentYear: 2026,
        reloadToken: 1,
        initialIncidents: [{ id: 1, title: 'Current year incident' }] as any
      })
    ).resolves.toEqual([
      {
        id: 2,
        name: 'Refreshed incident',
        title: 'Refreshed incident',
        state: 2,
        status: 2,
        startTime: 40,
        createTime: 40,
        updateTime: 50,
        contents: [
          { message: 'Investigating', state: 0, timestamp: 45 },
          { message: 'Monitoring', state: 2, timestamp: 50 }
        ]
      }
    ]);

    expect(apiGet).toHaveBeenCalledWith(
      `/status/page/public/incident?pageIndex=0&pageSize=9999&startTime=${new Date(2026, 0, 1).getTime()}`
    );
  });

  it('surfaces incident load failures without failing the whole status page', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({ name: 'OpenStatus' })
      .mockResolvedValueOnce([{ info: { id: 1, name: 'api', state: 0 } }])
      .mockRejectedValueOnce(new Error('incident feed unavailable'));

    const result = await loadStatusPageData(apiGet as any);

    expect(result).toEqual({
      org: { name: 'OpenStatus' },
      components: [
        {
          id: 1,
          name: 'api',
          state: 0,
          status: 0
        }
      ],
      incidents: [],
      incidentsError: 'incident feed unavailable'
    });
  });

  it('uses runtime fallback copy for blank incident load failures', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({ name: 'OpenStatus' })
      .mockResolvedValueOnce([{ info: { id: 1, name: 'api', state: 0 } }])
      .mockRejectedValueOnce(new Error('   '));

    const result = await loadStatusPageData(apiGet as any);

    expect(result.incidents).toEqual([]);
    expect(result.incidentsError).toBe('Failed to load public incidents');
  });

  it('shares public incident load-failure fallback for refresh failures', () => {
    expect(describeStatusIncidentLoadFailure(new Error('backend incident error'))).toBe('backend incident error');
    expect(describeStatusIncidentLoadFailure(new Error('   '))).toBe('Failed to load public incidents');
    expect(describeStatusIncidentLoadFailure('')).toBe('Failed to load public incidents');
    expect(describeStatusIncidentLoadFailure(new Error('   '), 'Localized refresh failure')).toBe('Localized refresh failure');
  });
});
