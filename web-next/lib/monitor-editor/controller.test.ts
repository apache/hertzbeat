import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  applyMonitorHostNameAutofill,
  buildMonitorEditCacheKey,
  buildMonitorEditorCollectorsUrl,
  buildMonitorEditorMonitorUrl,
  buildMonitorEditorParamDefinesUrl,
  buildMonitorDetectPayload,
  buildMonitorSavePayload,
  createMonitor,
  createMonitorFromFacade,
  detectMonitor,
  detectMonitorFromFacade,
  generateMonitorEditorReadableName,
  isValidMonitorCronExpression,
  loadMonitorEditorDraft,
  loadMonitorEditorDraftFromFacade,
  loadMonitorScrapeDraft,
  loadMonitorScrapeDraftFromFacade,
  resolveMonitorEditorParamChangeNotice,
  shouldPreserveMonitorScrapeParamsForLoad,
  syncMonitorDependentDisplay,
  updateMonitor,
  updateMonitorFromFacade,
  updateMonitorEditorParam,
  validateMonitorEditorDraft
} from './controller';

describe('monitor editor controller', () => {
  it('exposes stable editor resource URLs for workbench cache keys', () => {
    expect(buildMonitorEditorCollectorsUrl()).toBe('/collector');
    expect(buildMonitorEditorMonitorUrl('42')).toBe('/monitor/42');
    expect(buildMonitorEditorParamDefinesUrl('website')).toBe('/apps/website/params');
    expect(buildMonitorEditCacheKey(42)).toBe('monitor-editor-edit:/monitor/42:/collector');
  });

  it('loads new monitor draft from app params and collectors', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ content: [{ collector: { name: 'edge-a' } }] })
      .mockResolvedValueOnce([{ field: 'host', type: 'text', defaultValue: '127.0.0.1' }])
      .mockResolvedValueOnce([]);

    await expect(loadMonitorEditorDraft(apiGet as any, 'new', { app: 'website' })).resolves.toMatchObject({
      monitor: { app: 'website', scrape: 'static', scheduleType: 'interval', intervals: 60 },
      collectors: [{ name: 'edge-a' }],
      params: [{ field: 'host', paramValue: '127.0.0.1' }]
    });
  });

  it('loads monitor editor drafts from facade readers without exposing raw URLs to routes', async () => {
    const readMonitorDetail = vi.fn(async () => ({
      monitor: {
        id: 42,
        app: 'mysql',
        name: 'mysql-prod',
        instance: '127.0.0.1:3306',
        scrape: 'static',
        status: 2
      },
      params: [{ id: 25, field: 'host', paramValue: '127.0.0.1' }],
      collector: 'edge-a',
      grafanaDashboard: { enabled: true }
    }));
    const readCollectors = vi.fn(async () => ({
      content: [
        { collector: { name: 'main-default-collector' } },
        { collector: { name: 'edge-a', ip: '10.0.0.12', status: 0, mode: 'private' } }
      ]
    }));
    const readParamDefines = vi.fn(async (app: string) => (app === 'mysql' ? [{ field: 'host', type: 'text', defaultValue: '' }] : []));

    await expect(
      loadMonitorEditorDraftFromFacade(
        {
          readMonitorDetail,
          readCollectors,
          readParamDefines
        },
        'edit',
        { monitorId: '42' }
      )
    ).resolves.toMatchObject({
      monitor: { id: 42, app: 'mysql', scrape: 'static', scheduleType: 'interval', intervals: 60 },
      collector: 'edge-a',
      collectors: [{ name: 'edge-a', ip: '10.0.0.12', status: 0, mode: 'private' }],
      params: [{ id: 25, field: 'host', paramValue: '127.0.0.1' }],
      grafanaDashboard: { enabled: true }
    });

    expect(readMonitorDetail).toHaveBeenCalledWith('42');
    expect(readCollectors).toHaveBeenCalledTimes(1);
    expect(readParamDefines).toHaveBeenCalledWith('mysql');
  });

  it('maps the built-in main collector to system default dispatch instead of a pinned collector', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({
        monitor: {
          id: 42,
          app: 'mysql',
          name: 'mysql-prod',
          instance: '127.0.0.1:3306',
          scrape: 'static',
          status: 2
        },
        collector: 'main-default-collector',
        params: [{ id: 25, field: 'host', paramValue: '127.0.0.1' }]
      })
      .mockResolvedValueOnce({
        content: [
          { collector: { name: 'main-default-collector' } },
          { collector: { name: 'edge-a' } }
        ]
      })
      .mockResolvedValueOnce([{ field: 'host', type: 'text', defaultValue: '' }])
      .mockResolvedValueOnce([]);

    await expect(loadMonitorEditorDraft(apiGet as any, 'edit', { monitorId: '42' })).resolves.toMatchObject({
      collector: '',
      collectors: [{ name: 'edge-a' }],
      params: [{ id: 25, field: 'host', paramValue: '127.0.0.1' }]
    });
  });

  it('builds save/detect payloads and posts them', async () => {
    const draft = {
      monitor: { id: 1, app: 'website', name: 'demo', instance: '127.0.0.1', scrape: 'static', status: 0 },
      collector: 'edge-a',
      grafanaDashboard: { enabled: false },
      params: [{ field: 'host', paramValue: '127.0.0.1' }],
      advancedParams: [],
      scrapeParams: []
    } as any;
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);

    expect(buildMonitorSavePayload(draft)).toEqual({
      monitor: draft.monitor,
      collector: 'edge-a',
      params: [{ field: 'host', paramValue: '127.0.0.1' }],
      grafanaDashboard: { enabled: false }
    });
    expect(buildMonitorDetectPayload(draft)).toEqual({
      monitor: draft.monitor,
      collector: 'edge-a',
      params: [{ field: 'host', paramValue: '127.0.0.1' }]
    });

    await createMonitor(apiPost as any, draft);
    await updateMonitor(apiPut as any, draft);
    await detectMonitor(apiPost as any, draft);

    expect(apiPost).toHaveBeenCalledWith('/monitor', buildMonitorSavePayload(draft));
    expect(apiPut).toHaveBeenCalledWith('/monitor', buildMonitorSavePayload(draft));
    expect(apiPost).toHaveBeenCalledWith('/monitor/detect', buildMonitorDetectPayload(draft));
  });

  it('submits save and detect payloads through facade writers', async () => {
    const draft = {
      monitor: { id: 1, app: 'website', name: 'demo', instance: '127.0.0.1', scrape: 'static', status: 0 },
      collector: 'edge-a',
      grafanaDashboard: { enabled: false },
      params: [{ field: 'host', paramValue: '127.0.0.1' }],
      advancedParams: [],
      scrapeParams: []
    } as any;
    const writeCreate = vi.fn().mockResolvedValue(undefined);
    const writeUpdate = vi.fn().mockResolvedValue(undefined);
    const writeDetect = vi.fn().mockResolvedValue(undefined);

    await createMonitorFromFacade(writeCreate, draft);
    await updateMonitorFromFacade(writeUpdate, draft);
    await detectMonitorFromFacade(writeDetect, draft);

    expect(writeCreate).toHaveBeenCalledWith(buildMonitorSavePayload(draft));
    expect(writeUpdate).toHaveBeenCalledWith(buildMonitorSavePayload(draft));
    expect(writeDetect).toHaveBeenCalledWith(buildMonitorDetectPayload(draft));
  });

  it('matches Angular new-monitor host-change auto name behavior without touching edit mode', () => {
    const draft = {
      monitor: { id: 0, app: 'website', name: '', instance: '', scrape: 'static', status: 0 },
      collector: '',
      grafanaDashboard: { enabled: false },
      params: [{ field: 'host', paramValue: 'example.com' }],
      paramDefines: [{ field: 'host', type: 'text' }],
      advancedParams: [],
      advancedParamDefines: [],
      scrapeParams: [],
      scrapeParamDefines: [],
      collectors: []
    } as any;

    expect(
      applyMonitorHostNameAutofill(draft, {
        mode: 'new',
        field: 'host',
        generateName: () => 'Bright_Probe_23AB'
      }).monitor.name
    ).toBe('Bright_Probe_23AB');

    expect(
      applyMonitorHostNameAutofill(
        { ...draft, monitor: { ...draft.monitor, name: 'operator-name' } },
        {
          mode: 'new',
          field: 'host',
          generateName: () => 'Bright_Probe_23AB'
        }
      ).monitor.name
    ).toBe('operator-name');

    expect(
      applyMonitorHostNameAutofill(draft, {
        mode: 'edit',
        field: 'host',
        generateName: () => 'Bright_Probe_23AB'
      }).monitor.name
    ).toBe('');

    expect(generateMonitorEditorReadableName(() => 0)).toBe('Quick_Probe_22AA');
  });

  it('preserves existing param ids in update payloads', () => {
    const draft = {
      monitor: { id: 42, app: 'website', name: 'demo', instance: 'example.com:80', scrape: 'static', status: 1 },
      collector: '',
      grafanaDashboard: { enabled: false },
      params: [
        { id: 1, field: 'host', paramValue: 'example.com', type: 0 },
        { id: 2, field: 'port', paramValue: '80', type: 0 }
      ],
      advancedParams: [],
      scrapeParams: []
    } as any;

    expect(buildMonitorSavePayload(draft)).toEqual({
      monitor: { ...draft.monitor, instance: 'example.com' },
      collector: null,
      params: [
        { id: 1, field: 'host', paramValue: 'example.com', type: 0 },
        { id: 2, field: 'port', paramValue: '80', type: 0 }
      ],
      grafanaDashboard: { enabled: false }
    });
  });

  it('loads scrape draft params when scrape is dynamic', async () => {
    const apiGet = vi.fn().mockResolvedValue([{ field: 'service', type: 'text', defaultValue: 'catalog' }]);
    await expect(loadMonitorScrapeDraft(apiGet as any, 'http_sd')).resolves.toEqual({
      scrapeParams: [{ field: 'service', type: 1, paramValue: 'catalog' }],
      scrapeParamDefines: [{ field: 'service', type: 'text', defaultValue: 'catalog' }]
    });
  });

  it('loads dynamic scrape draft params from a facade param-define reader', async () => {
    const readParamDefines = vi.fn(async () => [{ field: 'service', type: 'text', defaultValue: 'catalog' }]);

    await expect(loadMonitorScrapeDraftFromFacade(readParamDefines, 'http_sd')).resolves.toEqual({
      scrapeParams: [{ field: 'service', type: 1, paramValue: 'catalog' }],
      scrapeParamDefines: [{ field: 'service', type: 'text', defaultValue: 'catalog' }]
    });

    expect(readParamDefines).toHaveBeenCalledWith('http_sd');
  });

  it('preserves existing scrape param values on reload', async () => {
    const apiGet = vi.fn().mockResolvedValue([{ field: 'service', type: 'text', defaultValue: 'catalog' }]);
    await expect(loadMonitorScrapeDraft(apiGet as any, 'http_sd', [{ field: 'service', paramValue: 'inventory' } as any])).resolves.toEqual({
      scrapeParams: [{ field: 'service', paramValue: 'inventory', type: 1 }],
      scrapeParamDefines: [{ field: 'service', type: 'text', defaultValue: 'catalog' }]
    });
  });

  it('matches Angular scrape reload lifecycle by preserving only the initial edit load', () => {
    expect(shouldPreserveMonitorScrapeParamsForLoad(null, 'http_sd')).toBe(true);
    expect(shouldPreserveMonitorScrapeParamsForLoad(undefined, 'nacos_sd')).toBe(true);
    expect(shouldPreserveMonitorScrapeParamsForLoad(null, 'static')).toBe(false);
    expect(shouldPreserveMonitorScrapeParamsForLoad('http_sd', 'dns_sd')).toBe(false);
    expect(shouldPreserveMonitorScrapeParamsForLoad('static', 'http_sd')).toBe(false);
  });

  it('syncs dependent visibility and boolean side effects', () => {
    const draft = {
      monitor: { app: 'api' },
      params: [
        { field: 'ssl', paramValue: false },
        { field: 'port', paramValue: 80 },
        { field: 'token', paramValue: '', display: true }
      ],
      paramDefines: [
        { field: 'ssl', type: 'boolean' },
        { field: 'port', type: 'number' },
        { field: 'token', depend: { ssl: [true] } }
      ],
      advancedParams: [],
      advancedParamDefines: [],
      scrapeParams: [],
      scrapeParamDefines: []
    } as any;

    expect(syncMonitorDependentDisplay(draft).params[2].display).toBe(false);
    const next = updateMonitorEditorParam(draft, 'params', 0, true);
    expect(next.params[1].paramValue).toBe(443);
    expect(next.params[2].display).toBe(true);
  });

  it('resolves Angular ssl port auto-change notification keys', () => {
    const apiDraft = {
      monitor: { app: 'api' },
      params: [
        { field: 'ssl', paramValue: false },
        { field: 'port', paramValue: 80 }
      ],
      advancedParams: [],
      scrapeParams: []
    } as any;
    const ftpDraft = {
      ...apiDraft,
      monitor: { app: 'ftp' },
      params: [
        { field: 'ssl', paramValue: false },
        { field: 'port', paramValue: 21 }
      ]
    } as any;

    expect(resolveMonitorEditorParamChangeNotice(apiDraft, 'params', 0, true)).toBe('monitor.new.notify.change-to-https');
    expect(resolveMonitorEditorParamChangeNotice({ ...apiDraft, params: [{ field: 'ssl' }, { field: 'port', paramValue: 443 }] } as any, 'params', 0, false)).toBe(
      'monitor.new.notify.change-to-http'
    );
    expect(resolveMonitorEditorParamChangeNotice(ftpDraft, 'params', 0, true)).toBe('monitor.new.notify.change-to-sftp');
    expect(resolveMonitorEditorParamChangeNotice({ ...ftpDraft, params: [{ field: 'ssl' }, { field: 'port', paramValue: 22 }] } as any, 'params', 0, false)).toBe(
      'monitor.new.notify.change-to-ftp'
    );
    expect(resolveMonitorEditorParamChangeNotice({ ...apiDraft, monitor: { app: 'website' } } as any, 'params', 0, true)).toBeNull();
  });

  it('trims monitor and param strings in save payloads', () => {
    const draft = {
      monitor: { id: 42, app: 'website', name: '  demo monitor  ', instance: 'example.com:80', scrape: 'static', status: 1, description: '  desc  ' },
      collector: '',
      grafanaDashboard: { enabled: false },
      params: [
        { id: 1, field: 'host', paramValue: ' example.com ', type: 1 },
        { id: 2, field: 'uri', paramValue: ' /health ', type: 1 }
      ],
      advancedParams: [],
      scrapeParams: []
    } as any;

    expect(buildMonitorSavePayload(draft)).toEqual({
      monitor: { ...draft.monitor, name: 'demo monitor', description: 'desc', instance: 'example.com' },
      collector: null,
      params: [
        { id: 1, field: 'host', paramValue: 'example.com', type: 1 },
        { id: 2, field: 'uri', paramValue: '/health', type: 1 }
      ],
      grafanaDashboard: { enabled: false }
    });
  });

  it('matches Angular detect/save payload shape for merged params, host instance, and Grafana', () => {
    const draft = {
      monitor: {
        id: 42,
        app: 'prometheus',
        name: '  prometheus monitor  ',
        instance: 'prometheus:9090',
        scrape: 'http_sd',
        scheduleType: 'interval',
        intervals: 60,
        status: 1
      },
      collector: ' edge-a ',
      grafanaDashboard: { enabled: true, template: '{"panels":[]}' },
      params: [
        { id: 1, field: 'host', paramValue: ' prometheus.local ', type: 1 },
        { id: 2, field: 'port', paramValue: ' 9090 ', type: 1 }
      ],
      paramDefines: [
        { field: 'host', type: 'text' },
        { field: 'port', type: 'text' }
      ],
      advancedParams: [{ id: 3, field: 'timeout', paramValue: ' 3 ', type: 1 }],
      advancedParamDefines: [{ field: 'timeout', type: 'text' }],
      scrapeParams: [{ id: 4, field: 'sd_url', paramValue: ' https://sd.local/targets ', type: 1 }],
      scrapeParamDefines: [{ field: 'sd_url', type: 'text' }]
    } as any;

    expect(buildMonitorDetectPayload(draft)).toEqual({
      monitor: {
        ...draft.monitor,
        name: 'prometheus monitor',
        instance: 'prometheus.local'
      },
      collector: 'edge-a',
      params: [
        { id: 1, field: 'host', paramValue: 'prometheus.local', type: 1 },
        { id: 2, field: 'port', paramValue: '9090', type: 1 },
        { id: 3, field: 'timeout', paramValue: '3', type: 1 },
        { id: 4, field: 'sd_url', paramValue: 'https://sd.local/targets', type: 1 }
      ]
    });
    expect(buildMonitorDetectPayload(draft)).not.toHaveProperty('grafanaDashboard');
    expect(buildMonitorSavePayload(draft)).toEqual({
      monitor: {
        ...draft.monitor,
        name: 'prometheus monitor',
        instance: 'prometheus.local'
      },
      collector: 'edge-a',
      params: [
        { id: 1, field: 'host', paramValue: 'prometheus.local', type: 1 },
        { id: 2, field: 'port', paramValue: '9090', type: 1 },
        { id: 3, field: 'timeout', paramValue: '3', type: 1 },
        { id: 4, field: 'sd_url', paramValue: 'https://sd.local/targets', type: 1 }
      ],
      grafanaDashboard: { enabled: true, template: '{"panels":[]}' }
    });
  });

  it('validates required fields and cron expressions before detect/save', () => {
    const t = createTranslatorMock();
    const draft = {
      monitor: {
        id: 0,
        app: 'website',
        name: '   ',
        instance: '',
        scrape: 'static',
        status: 0,
        scheduleType: 'cron',
        cronExpression: 'bad cron'
      },
      params: [
        { field: 'host', paramValue: '   ', display: true },
        { field: 'port', paramValue: 80, display: true }
      ],
      paramDefines: [
        { field: 'host', type: 'text', required: true, name: 'Host' },
        { field: 'port', type: 'number', required: true, name: 'Port' }
      ],
      advancedParams: [],
      advancedParamDefines: [],
      scrapeParams: [],
      scrapeParamDefines: []
    } as any;

    expect(validateMonitorEditorDraft(draft, t)).toBe('Monitor name is required');

    draft.monitor.name = 'demo';
    expect(validateMonitorEditorDraft(draft, t)).toBe('Host is required');

    draft.params[0].paramValue = 'example.com';
    expect(validateMonitorEditorDraft(draft, t)).toBe('Cron expression is invalid');
    expect(validateMonitorEditorDraft(draft, t, { validateCronFormat: false })).toBeNull();

    draft.monitor.cronExpression = '   ';
    expect(validateMonitorEditorDraft(draft, t, { validateCronFormat: false })).toBe('Cron expression is invalid');
  });

  it('localizes monitor editor validation copy in zh-CN', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const draft = {
      monitor: {
        id: 0,
        app: 'website',
        name: '   ',
        instance: '',
        scrape: 'static',
        status: 0,
        scheduleType: 'cron',
        cronExpression: 'bad cron'
      },
      params: [
        { field: 'host', paramValue: '   ', display: true },
        { field: 'port', paramValue: 80, display: true }
      ],
      paramDefines: [
        { field: 'host', type: 'text', required: true, name: 'Host' },
        { field: 'port', type: 'number', required: true, name: 'Port' }
      ],
      advancedParams: [],
      advancedParamDefines: [],
      scrapeParams: [],
      scrapeParamDefines: []
    } as any;

    expect(validateMonitorEditorDraft(draft, t)).toBe('请输入监控名称');

    draft.monitor.name = 'demo';
    expect(validateMonitorEditorDraft(draft, t)).toBe('请填写 Host');

    draft.params[0].paramValue = 'example.com';
    expect(validateMonitorEditorDraft(draft, t)).toBe('Cron 表达式不合法');
  });

  it('accepts common five-field and six-field cron expressions', () => {
    expect(isValidMonitorCronExpression('*/5 * * * *')).toBe(true);
    expect(isValidMonitorCronExpression('0 */5 * * * *')).toBe(true);
    expect(isValidMonitorCronExpression('')).toBe(false);
    expect(isValidMonitorCronExpression('bad cron')).toBe(false);
  });
});
