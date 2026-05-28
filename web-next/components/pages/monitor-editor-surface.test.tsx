import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MonitorEditorSurface } from './monitor-editor-surface';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const i18nMockState = vi.hoisted(() => ({
  locale: 'en-US' as 'en-US' | 'zh-CN'
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: i18nMockState.locale }),
    locale: i18nMockState.locale
  })
}));

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, readOnly, extensions, height, minHeight, basicSetup, theme, onChange, ...props }: any) => (
    <div
      data-testid={props['data-testid']}
      data-mocked-codemirror="true"
      data-readonly={readOnly ? 'true' : 'false'}
      data-height={height}
      data-min-height={minHeight}
      data-basic-setup={basicSetup ? 'true' : 'false'}
      data-theme={theme ? 'custom-dark' : 'missing'}
      data-extension-count={Array.isArray(extensions) ? String(extensions.length) : '0'}
      onClick={() => onChange?.(`${value}\nnext`)}
    >
      {value}
    </div>
  )
}));

vi.mock('@codemirror/lang-yaml', () => ({ yaml: () => 'yaml-extension' }));
vi.mock('@codemirror/lang-json', () => ({ json: () => 'json-extension' }));
vi.mock('@codemirror/lang-html', () => ({ html: () => 'html-extension' }));
vi.mock('@codemirror/lang-javascript', () => ({ javascript: () => 'javascript-extension' }));
vi.mock('@codemirror/view', () => ({
  EditorView: {
    lineWrapping: 'line-wrapping-extension',
    theme: () => 'theme-extension'
  }
}));
vi.mock('@codemirror/state', () => ({
  EditorState: {
    readOnly: {
      of: () => 'readonly-extension'
    }
  }
}));
vi.mock('@codemirror/theme-one-dark', () => ({ oneDark: 'one-dark-theme' }));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  buttonVariants: () => ''
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ children: _children, ...props }: any) => <textarea data-cold-textarea-owner="cold-textarea" {...props} />
}));

vi.mock('../ui/number-stepper', () => ({
  NumberStepper: ({ value, onValueChange: _onValueChange, ...props }: any) => (
    <span data-cold-number-stepper-owner="cold-number-stepper">
      <input type="text" data-cold-number-stepper-input="true" value={value} readOnly {...props} />
      <button type="button" data-cold-number-stepper-action="decrement">减少</button>
      <button type="button" data-cold-number-stepper-action="increment">增加</button>
    </span>
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('../ui/cold-code-editor', () => ({
  ColdCodeEditor: ({ value, language, minHeight, onChange: _onChange, ...props }: any) => (
    <div
      data-monitor-grafana-code-editor={props['data-monitor-grafana-code-editor']}
      data-monitor-param-code-editor={props['data-monitor-param-code-editor']}
      data-monitor-param-field={props['data-monitor-param-field']}
      data-cold-code-editor="codemirror"
      data-cold-code-editor-language={language}
      data-cold-code-editor-min-height={minHeight}
    >
      {props.name ? <input type="hidden" name={props.name} value={value} /> : null}
      {value}
    </div>
  )
}));

vi.mock('@/components/workbench/primitives', () => ({
  SurfaceSection: ({ title, copy, children }: any) => (
    <section>
      <h3>{title}</h3>
      <p>{copy}</p>
      {children}
    </section>
  )
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  WorkbenchPage: ({ kicker, title, subtitle, facts, actions, main, side }: any) => (
    <main>
      <div>{kicker}</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>
        {(facts || []).map((fact: any, index: number) => (
          <div key={`${fact.label}-${index}`} data-monitor-editor-fact={fact.label} data-monitor-editor-fact-value={fact.value}>
            {`${fact.label}:${fact.value}`}
          </div>
        ))}
      </div>
      <div>{actions}</div>
      <div>{main}</div>
      <aside>{side}</aside>
    </main>
  ),
  RowList: ({ rows }: any) => (
    <div>
      {rows.map((row: any, index: number) => (
        <div
          key={`${row.title}-${index}`}
          data-monitor-editor-payload-row={row.title}
          data-monitor-editor-payload-copy={row.copy}
          data-monitor-editor-payload-meta={row.meta}
        >
          {`${row.title}:${row.copy}:${row.meta}`}
        </div>
      ))}
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('@/lib/monitor-api-facade', () => ({
  api: {
    monitors: {
      create: vi.fn(),
      detect: vi.fn(),
      editorParamDefines: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock('@/lib/monitor-editor/controller', () => ({
  applyMonitorHostNameAutofill: (draft: any) => draft,
  createMonitorFromFacade: vi.fn(),
  detectMonitorFromFacade: vi.fn(),
  loadMonitorScrapeDraftFromFacade: vi.fn(async () => ({ scrapeParams: [], scrapeParamDefines: [] })),
  shouldPreserveMonitorScrapeParamsForLoad: (previousScrape: string | null | undefined, nextScrape: string) =>
    !previousScrape && nextScrape !== 'static',
  syncMonitorDependentDisplay: (draft: any) => draft,
  updateMonitorFromFacade: vi.fn(),
  updateMonitorEditorParam: (draft: any, kind: string, index: number, value: unknown) => ({
    ...draft,
    [kind]: draft[kind].map((row: any, rowIndex: number) => (rowIndex === index ? { ...row, paramValue: value } : row))
  }),
  validateMonitorEditorDraft: vi.fn(() => null)
}));

vi.mock('@/lib/monitor-editor/navigation', () => ({
  buildMonitorEditorCancelUrl: () => '/monitors',
  buildMonitorEditorReturnUrl: () => '/monitors?app=website'
}));

vi.mock('@/lib/monitor-editor/localized-text', () => ({
  resolveLocalizedText: (value: any, _locale: string, fallback: string) => {
    if (typeof value === 'string') return value;
    return fallback;
  }
}));

vi.mock('@/lib/entity-editor/draft-utils', () => ({
  fromKeyValueDraft: (rows: Array<{ key: string; value: string }>) =>
    rows.reduce<Record<string, string>>((acc, row) => {
      if (row.key.trim()) acc[row.key.trim()] = row.value.trim();
      return acc;
    }, {}),
  toKeyValueDraft: (record?: Record<string, string>) =>
    Object.entries(record || {}).length > 0
      ? Object.entries(record || {}).map(([key, value]) => ({ key, value }))
      : [{ key: '', value: '' }]
}));

vi.mock('@/lib/entity-editor/editor-state', () => ({
  ensureKeyValueRows: (rows: Array<{ key: string; value: string }>) => (rows.length > 0 ? rows : [{ key: '', value: '' }]),
  removeRowAt: (rows: Array<{ key: string; value: string }>, index: number) =>
    rows.length === 1 ? [{ key: '', value: '' }] : rows.filter((_, rowIndex) => rowIndex !== index),
  updateRowAt: (rows: Array<{ key: string; value: string }>, index: number, patch: Record<string, string>) =>
    rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | undefined | null | false>) => values.filter(Boolean).join(' ')
}));

describe('MonitorEditorSurface', () => {
  it('renders structured label and annotation rows instead of raw JSON textareas', () => {
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:80',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: { team: 'platform' },
            annotations: { owner: 'sre' }
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: 'example.com' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    expect(html).toContain('Add label');
    expect(html).toContain('Add annotation');
    expect(html).toContain('data-monitor-editor-label-selector="angular-app-label-selector"');
    expect(html).toContain('data-monitor-editor-label-selector-owner="cold-label-selector"');
    expect(html).toContain('data-cold-label-selector-owner="cold-label-selector"');
    expect(html).toContain('data-cold-label-selector-record-row="team:platform"');
    expect(html).toContain('data-cold-label-selector-key-input="searchable-key"');
    expect(html).toContain('data-cold-label-selector-value-input="searchable-value"');
    expect(html).toContain('data-hz-ui="key-value-editor"');
    expect(html).toContain('data-monitor-editor-key-value-owner="hertzbeat-ui-key-value-editor"');
    expect(html).toContain('data-hz-key-value-action="add"');
    expect(html).toContain('data-hz-key-value-footer="action-row"');
    expect(html).toContain('data-hz-key-value-action-layout="footer-command"');
    expect(html).toContain('<form');
    expect(html).toContain('team');
    expect(html).toContain('platform');
    expect(html).toContain('owner');
    expect(html).toContain('sre');
    expect(html).not.toContain('JSON object for monitor labels.');
    expect(html).not.toContain('JSON object for monitor annotations.');
  });

  it('renders monitor editor label and annotation actions in zh-CN', () => {
    i18nMockState.locale = 'zh-CN';
    try {
      const html = renderToStaticMarkup(
        <MonitorEditorSurface
          initial={{
            monitor: {
              id: 42,
              app: 'website',
              name: 'checkout',
              instance: 'example.com:80',
              scrape: 'static',
              scheduleType: 'interval',
              intervals: 60,
              status: 1,
              labels: { team: 'platform' },
              annotations: { owner: 'sre' }
            } as any,
            collector: '',
            grafanaDashboard: { enabled: false },
            params: [{ field: 'host', paramValue: 'example.com' }],
            paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
            advancedParams: [],
            advancedParamDefines: [],
            scrapeParams: [],
            scrapeParamDefines: [],
            collectors: []
          }}
          mode="edit"
          returnContext={{ returnTo: '/monitors?app=website' }}
        />
      );

      expect(html).toContain('添加标签');
      expect(html).toContain('添加注解');
      expect(html).not.toContain('Add label');
      expect(html).not.toContain('Add annotation');
    } finally {
      i18nMockState.locale = 'en-US';
    }
  });

  it('renders the system default collector option instead of treating it as none', () => {
    i18nMockState.locale = 'zh-CN';
    try {
      const html = renderToStaticMarkup(
        <MonitorEditorSurface
          initial={{
            monitor: {
              id: 42,
              app: 'mysql',
              name: 'mysql-prod',
              instance: '127.0.0.1:3306',
              scrape: 'static',
              scheduleType: 'interval',
              intervals: 10,
              status: 2,
              labels: {},
              annotations: {}
            } as any,
            collector: '',
            grafanaDashboard: { enabled: false },
            params: [{ field: 'host', paramValue: '127.0.0.1' }],
            paramDefines: [{ field: 'host', type: 'text', name: '目标Host', required: true }],
            advancedParams: [],
            advancedParamDefines: [],
            scrapeParams: [],
            scrapeParamDefines: [],
            collectors: ['edge-a']
          }}
          mode="edit"
          returnContext={{ returnTo: '/monitors?app=mysql' }}
        />
      );

      expect(html).toContain('默认系统调度');
      expect(html).toContain('data-monitor-editor-collector-selection="angular-collectors-selection-tags"');
      expect(html).toContain('data-monitor-editor-collector-tags="angular-status-ip-mode-tags"');
      expect(html).toContain('data-monitor-editor-collector-tag="system-default"');
      expect(html).not.toContain('<option value="" selected="">无</option>');
    } finally {
      i18nMockState.locale = 'en-US';
    }
  });

  it('preserves Angular collector option status, ip, and mode context', () => {
    i18nMockState.locale = 'zh-CN';
    try {
      const html = renderToStaticMarkup(
        <MonitorEditorSurface
          initial={{
            monitor: {
              id: 42,
              app: 'mysql',
              name: 'mysql-prod',
              instance: '127.0.0.1:3306',
              scrape: 'static',
              scheduleType: 'interval',
              intervals: 10,
              status: 2,
              labels: {},
              annotations: {}
            } as any,
            collector: 'edge-a',
            grafanaDashboard: { enabled: false },
            params: [{ field: 'host', paramValue: '127.0.0.1' }],
            paramDefines: [{ field: 'host', type: 'text', name: '目标Host', required: true }],
            advancedParams: [],
            advancedParamDefines: [],
            scrapeParams: [],
            scrapeParamDefines: [],
            collectors: [{ name: 'edge-a', ip: '10.0.0.12', status: 0, mode: 'private' }]
          }}
          mode="edit"
          returnContext={{ returnTo: '/monitors?app=mysql' }}
        />
      );

      expect(html).toContain('edge-a · 10.0.0.12');
      expect(html).toContain('data-monitor-editor-collector-selection-owner="hertzbeat-ui-select"');
      expect(html).toContain('data-monitor-editor-collector-tags="angular-status-ip-mode-tags"');
      expect(html).toContain('data-monitor-editor-collector-tag="status"');
      expect(html).toContain('data-monitor-editor-collector-tag="ip"');
      expect(html).toContain('data-monitor-editor-collector-tag="mode"');
      expect(html).toContain('10.0.0.12');
    } finally {
      i18nMockState.locale = 'en-US';
    }
  });

  it('renders monitor editor as a linear Angular-style form instead of a split workbench', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'prometheus',
            name: '',
            instance: '',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: '127.0.0.1' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [{ field: 'headers', paramValue: '{}' }],
          advancedParamDefines: [{ field: 'headers', type: 'key-value', name: 'Headers' }],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="new"
        returnContext={{ returnTo: '/monitors' }}
      />
    );

    const baseIndex = html.indexOf('Basic settings');
    const paramsIndex = html.indexOf('Runtime parameters');
    const advancedIndex = html.indexOf('Advanced');
    const runtimeIndex = html.indexOf('Collection schedule');
    const labelsIndex = html.indexOf('Labels');
    const annotationsIndex = html.indexOf('Annotations');
    const descriptionIndex = html.indexOf('Description');
    const actionsIndex = html.indexOf('data-monitor-editor-action-dock="bottom"');

    expect(html).toContain('data-monitor-editor-layout="linear"');
    expect(html).toContain('data-hz-ui="monitor-editor-form"');
    expect(html).toContain('data-monitor-editor-form-owner="hertzbeat-ui-monitor-editor-form"');
    expect(html).toContain('data-monitor-editor-linear-shell="true"');
    expect(html).toContain('data-hz-ui="monitor-editor-header"');
    expect(html).toContain('data-monitor-editor-linear-header="hertzbeat-ui-monitor-editor-header"');
    expect(html).toContain('data-hz-ui="monitor-editor-field-grid"');
    expect(html).toContain('data-monitor-editor-field-grid-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect((html.match(/data-hz-ui="monitor-editor-field-grid"/g) ?? []).length).toBe(3);
    expect(html).toContain('data-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"');
    expect(html).toContain('data-monitor-editor-advanced-visible-contract="angular-visible-param-only"');
    expect(html).toContain('data-monitor-editor-advanced-collapse-state="collapsed"');
    expect(html).toContain('data-monitor-editor-advanced-toggle="angular-dashed-collapse-trigger"');
    expect(html).toContain('data-monitor-editor-detect-cron-validation="angular-detect-skips-cron-format"');
    expect(html).toContain('data-monitor-editor-cron-required="angular-required-before-detect-save"');
    expect(html).not.toContain('data-monitor-editor-advanced-fields="expanded"');
    expect(baseIndex).toBeGreaterThan(-1);
    expect(baseIndex).toBeLessThan(paramsIndex);
    expect(paramsIndex).toBeLessThan(advancedIndex);
    expect(advancedIndex).toBeLessThan(runtimeIndex);
    expect(runtimeIndex).toBeLessThan(labelsIndex);
    expect(labelsIndex).toBeLessThan(annotationsIndex);
    expect(annotationsIndex).toBeLessThan(descriptionIndex);
    expect(descriptionIndex).toBeLessThan(actionsIndex);
    expect(html).not.toContain('data-monitor-editor-fact=');
    expect(html).not.toContain('data-monitor-editor-payload-row=');
    expect(html).not.toContain('Monitor Configuration');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('RowList');
    expect(source).toContain('HzMonitorEditorForm');
    expect(source).toContain('HzMonitorEditorHeader');
    expect(source).toContain('HzMonitorEditorFieldGrid');
    expect(source).toContain('validateBeforeSubmit(nextDraft, { validateCronFormat: false })');
    expect(source).not.toContain('className="mx-auto w-full max-w-[980px] space-y-3"');
    expect(source).not.toContain('className="grid gap-3 md:grid-cols-2"');
    expect(source).not.toContain('<div className="space-y-3" data-monitor-editor-linear-shell="true">');
    expect(source).not.toContain('<header\n          className="border-b border-[var(--hz-ui-line-soft)] px-3 pb-3 pt-2"');
  });

  it('keeps the embedded editor action posture inside one form', () => {
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:80',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: 'example.com' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    const detectIndex = html.indexOf('Detect');
    const okIndex = html.indexOf('OK');
    const cancelIndex = html.indexOf('Cancel');

    expect(detectIndex).toBeGreaterThan(-1);
    expect(okIndex).toBeGreaterThan(-1);
    expect(cancelIndex).toBeGreaterThan(-1);
    expect(detectIndex).toBeLessThan(okIndex);
    expect(okIndex).toBeLessThan(cancelIndex);
    expect(html).toContain('data-monitor-editor-cancel-action="true"');
  });

  it('uses the shared mutation bar for monitor editor actions and feedback instead of page-local action chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:80',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: 'example.com' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    expect(html).toContain('data-hz-ui="mutation-bar"');
    expect(html).toContain('data-hz-ui="monitor-editor-action-bar"');
    expect(html).toContain('data-hz-ui="monitor-editor-section"');
    expect(html).toContain('data-monitor-editor-label-selector="angular-app-label-selector"');
    expect(html).toContain('data-monitor-editor-label-selector-owner="cold-label-selector"');
    expect(html).toContain('data-monitor-editor-key-value="annotations"');
    expect(html).toContain('data-monitor-editor-section-owner="hertzbeat-ui-editor-section"');
    expect(html).toContain('data-monitor-editor-field-owner="hertzbeat-ui-field"');
    expect(html).toContain('data-hz-ui="field"');
    expect(html).toContain('data-hz-ui="input"');
    expect(html).toContain('data-monitor-editor-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-monitor-editor-app-source="angular-route-context-hidden-field"');
    expect(html).toContain('data-monitor-editor-hidden-app="route-or-detail-context"');
    expect(html).not.toContain('data-monitor-editor-input="app"');
    expect(html).toContain('data-monitor-editor-field-order="angular-monitor-form-sequence"');
    expect(html).toContain('data-monitor-editor-detect-payload-contract="angular-monitor-collector-params-no-grafana"');
    expect(html).toContain('data-monitor-editor-save-payload-contract="angular-monitor-collector-params-grafana"');
    expect(html).toContain('data-monitor-editor-payload-param-merge="angular-params-advanced-sdparams"');
    expect(html).toContain('data-monitor-editor-payload-host-instance="angular-host-param-as-instance"');
    expect(html).toContain('data-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"');
    expect(html).toContain('data-monitor-editor-advanced-visible-contract="angular-visible-param-only"');
    expect(html).toContain('data-monitor-editor-label-selector="angular-app-label-selector"');
    expect(html).toContain('data-monitor-editor-static-host-position="angular-before-name"');
    expect(html).toContain('data-monitor-editor-static-host-field="angular-before-name"');
    expect(html).toContain('data-monitor-editor-input="name"');
    expect(html).toContain('data-monitor-param-input="host"');
    expect(html.indexOf('data-monitor-editor-static-host-field="angular-before-name"')).toBeLessThan(
      html.indexOf('data-monitor-editor-input="name"')
    );
    expect(html).toContain('data-monitor-editor-host-name-autofill-contract="angular-new-host-change"');
    expect(html).not.toContain('data-monitor-editor-host-name-autofill-target="monitor-name"');
    expect(html).toContain('data-hz-ui="select"');
    expect(html).toContain('data-monitor-editor-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-monitor-editor-select="scrape"');
    expect(html).toContain('data-monitor-editor-select="collector"');
    expect(html).toContain('data-monitor-editor-select="schedule-type"');
    expect(html).toContain('data-hz-mutation-status="clean"');
    expect(html).toContain('data-hz-mutation-issue-count="0"');
    expect(html).toContain('data-monitor-editor-action-dock="bottom"');
    expect(html).toContain('data-monitor-editor-mutation-bar="true"');
    expect(html).toContain('data-monitor-editor-action-bar-owner="hertzbeat-ui-monitor-editor-action-bar"');
    expect(html).toContain('data-monitor-editor-action-bar-layout="centered-footer"');
    expect(html).toContain('data-monitor-editor-action="detect"');
    expect(html).toContain('data-monitor-editor-action="submit"');
    expect(html).toContain('data-monitor-editor-action="cancel"');
    expect(html).toContain('data-monitor-editor-action-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-monitor-editor-detect-action="true"');
    expect(html).toContain('data-monitor-editor-submit-action="true"');
    expect(html).toContain('data-monitor-editor-detect-busy-label="Available Detecting"');
    expect(html).toContain('data-monitor-editor-submit-busy-label="Loading..."');
    expect(html).toContain('data-monitor-editor-save-return="safe-return-context-or-angular-app-list"');
    expect(html).toContain('data-monitor-editor-save-return-target="/monitors?app=website"');
    expect(html).toContain('data-monitor-editor-save-notification-contract="angular-success-before-return"');
    expect(html).toContain('data-monitor-editor-cancel-action="true"');
    expect(html).toContain('data-monitor-editor-cancel-return="safe-return-context-or-list-root"');
    expect(html).toContain('data-monitor-editor-cancel-return-target="/monitors"');
    expect(html.indexOf('data-monitor-editor-section-owner="hertzbeat-ui-editor-section"')).toBeLessThan(
      html.indexOf('data-monitor-editor-action-dock="bottom"')
    );
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzMonitorEditorActionBar');
    expect(source).toContain('buildMonitorEditorCancelUrl');
    expect(source).not.toContain('HzMutationBar');
    expect(source).not.toContain('data-monitor-editor-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('variant="embedded"');
    expect(source).toContain('data-monitor-editor-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain("useState<'idle' | 'detecting' | 'saving'>('idle')");
    expect(source).toContain("useState<'validation' | 'api' | null>(null)");
    expect(source).toContain("useState<'detect' | 'save' | null>(null)");
    expect(source).toContain("actionPhase === 'detecting' ? t('monitor.spinning-tip.detecting') : t('common.loading')");
    expect(source).toContain('data-monitor-editor-feedback="busy"');
    expect(source).toContain('data-monitor-editor-busy-contract="angular-spin-tip"');
    expect(source).toContain('data-monitor-editor-busy-phase={actionPhase}');
    expect(source).toContain('data-monitor-editor-validation-contract');
    expect(source).toContain('data-monitor-editor-api-error-contract');
    expect(source).toContain('data-monitor-editor-blocked-action');
    expect(source).toContain('data-monitor-editor-blocked-before-api');
    expect(source).toContain("setActionErrorSource('validation')");
    expect(source).toContain("setActionErrorSource('api')");
    expect(source).toContain("setActionErrorAction('detect')");
    expect(source).toContain("setActionErrorAction('save')");
    expect(source).toContain("setActionError(error instanceof Error ? error.message : t('monitor.detect.failed'))");
    expect(source).toContain(
      "setActionError(error instanceof Error ? error.message : mode === 'new' ? t('monitor.new.failed') : t('monitor.edit.failed'))"
    );
    expect(source).toContain('data-monitor-editor-detect-busy-label');
    expect(source).toContain('data-monitor-editor-submit-busy-label');
    expect(source).toContain('saveReturnUrl');
    expect(source).toContain('cancelReturnUrl');
    expect(source).toContain('data-monitor-editor-save-return');
    expect(source).toContain('data-monitor-editor-save-return-target');
    expect(source).toContain('data-monitor-editor-save-notification-contract');
    expect(source).toContain('data-monitor-editor-cancel-return-target');
    expect(source).toContain('data-monitor-editor-feedback="error"');
    expect(source).toContain('data-monitor-editor-feedback="success"');
    expect(source).not.toContain('className="border-0"');
    expect(source).toContain('HzMonitorEditorSection');
    expect(source).toContain('HzKeyValueEditor');
    expect(source).toContain('LabelRecordInput');
    expect(source).toContain('data-monitor-editor-label-selector="angular-app-label-selector"');
    expect(source).toContain('data-monitor-editor-label-selector-owner="cold-label-selector"');
    expect(source).not.toContain('data-monitor-editor-key-value="labels"');
    expect(source).toContain('data-monitor-editor-key-value="annotations"');
    expect(source).toContain('HzField');
    expect(source).toContain('applyMonitorHostNameAutofill');
    expect(source).toContain("field: defines[index]?.field");
    expect(source).toContain('HzInput');
    expect(source).toContain('data-monitor-editor-input-owner="hertzbeat-ui-input"');
    expect(source).toContain('data-monitor-editor-app-source="angular-route-context-hidden-field"');
    expect(source).toContain('data-monitor-editor-hidden-app="route-or-detail-context"');
    expect(source).toContain('data-monitor-editor-field-order="angular-monitor-form-sequence"');
    expect(source).toContain('data-monitor-editor-detect-payload-contract="angular-monitor-collector-params-no-grafana"');
    expect(source).toContain('data-monitor-editor-save-payload-contract="angular-monitor-collector-params-grafana"');
    expect(source).toContain('data-monitor-editor-payload-param-merge="angular-params-advanced-sdparams"');
    expect(source).toContain('data-monitor-editor-payload-host-instance="angular-host-param-as-instance"');
    expect(source).toContain('data-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"');
    expect(source).toContain('data-monitor-editor-advanced-visible-contract="angular-visible-param-only"');
    expect(source).toContain('data-monitor-editor-label-selector="angular-app-label-selector"');
    expect(source).toContain('data-monitor-editor-advanced-toggle="angular-dashed-collapse-trigger"');
    expect(source).toContain('setAdvancedOpen(open => !open)');
    expect(source).toContain('data-monitor-editor-static-host-position="angular-before-name"');
    expect(source).toContain('data-monitor-editor-static-host-field="angular-before-name"');
    expect(source).toContain('data-monitor-editor-scrape-param-order="angular-after-scrape-before-name"');
    expect(source).toContain('data-monitor-editor-runtime-order="angular-after-advanced-before-labels"');
    expect(source).toContain("define.field === 'host'");
    expect(source).not.toContain('data-monitor-editor-input="app"');
    expect(source).toContain('data-monitor-editor-input="name"');
    expect(source).toContain('data-monitor-editor-input="cron-expression"');
    expect(source).toContain('data-monitor-editor-cron-required="angular-required-before-detect-save"');
    expect(source).toContain('required');
    expect(source).toContain('data-monitor-param-input={define.field}');
    expect(source).toContain('HzSelect');
    expect(source).toContain('data-monitor-editor-select-owner="hertzbeat-ui-select"');
    expect(source).toContain('data-monitor-editor-select="scrape"');
    expect(source).toContain('data-monitor-editor-select="collector"');
    expect(source).toContain('data-monitor-editor-select="schedule-type"');
    expect(source).toContain('data-monitor-param-radio={define.field}');
    expect(source).toContain('data-monitor-param-radio-contract="angular-nz-radio-group-button-solid"');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('function KeyValueEditor');
    expect(source).not.toContain("import { Button } from '@/components/ui/button'");
    expect(source).not.toContain("import { Input } from '@/components/ui/input'");
    expect(source).not.toContain("import { Select } from '@/components/ui/select'");
    expect(source).not.toContain('const fieldLabelClassName');
    expect(source).not.toContain('text-emerald-300');
    expect(source).not.toContain('text-rose-300');
  });

  it('keeps scrape loading feedback owned by @hertzbeat/ui instead of page-local text chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');

    expect(source).toContain('HzLoadingState');
    expect(source).toContain('data-monitor-editor-scrape-loading-owner="hertzbeat-ui-loading-state"');
    expect(source).not.toContain('text-sm text-[var(--ops-text-secondary)]');
  });

  it('loads dynamic scrape params through the monitor domain facade instead of a raw getter', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');

    expect(source).toContain('loadMonitorScrapeDraftFromFacade(api.monitors.editorParamDefines');
    expect(source).toContain("if (scrape === 'static')");
    expect(source).toContain('data-monitor-editor-service-discovery-params="angular-nonstatic-only"');
    expect(source).toContain('data-monitor-editor-scrape-reload-contract="angular-reset-on-user-scrape-change"');
    expect(source).toContain('shouldPreserveMonitorScrapeParamsForLoad(previousScrape, scrape)');
    expect(source).toContain('shouldPreserveExistingParams ? scrapeParamsRef.current : undefined');
    expect(source).not.toContain('loadMonitorScrapeDraft(apiMessageGet');
    expect(source).not.toContain("import { apiMessageGet");
  });

  it('keeps Angular ssl port auto-change info notification behavior wired in the shared editor', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'api',
            name: 'checkout',
            instance: 'example.com:80',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [
            { field: 'ssl', paramValue: false },
            { field: 'port', paramValue: 80 }
          ],
          paramDefines: [
            { field: 'ssl', type: 'boolean', name: 'SSL' },
            { field: 'port', type: 'number', name: 'Port' }
          ],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="new"
      />
    );

    expect(source).toContain('resolveMonitorEditorParamChangeNotice(draft, kind, index, value)');
    expect(source).toContain('setActionMessage(t(noticeKey))');
    expect(html).toContain('data-monitor-editor-ssl-port-notice="angular-info-notification"');
    expect(html).toContain('data-monitor-param-switch="ssl"');
    expect(html).toContain('data-monitor-param-boolean-contract="angular-nz-switch"');
    expect(html).toContain('data-monitor-param-number-stepper="port"');
  });

  it('submits monitor editor mutations through the monitor domain facade instead of raw API writers', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');

    expect(source).toContain('detectMonitorFromFacade(api.monitors.detect');
    expect(source).toContain('createMonitorFromFacade(api.monitors.create');
    expect(source).toContain('updateMonitorFromFacade(api.monitors.update');
    expect(source).not.toContain("import { apiMessagePost");
    expect(source).not.toContain("import { apiMessagePut");
    expect(source).not.toContain('detectMonitor(apiMessagePost');
    expect(source).not.toContain('createMonitor(apiMessagePost');
    expect(source).not.toContain('updateMonitor(apiMessagePut');
  });

  it('keeps Angular monitor form field order for service-discovery params and runtime controls', () => {
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:80',
            scrape: 'http_sd',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [
            { field: 'host', paramValue: 'example.com' },
            { field: 'port', paramValue: 80 }
          ],
          paramDefines: [
            { field: 'host', type: 'text', name: 'Host', required: true },
            { field: 'port', type: 'number', name: 'Port', required: true }
          ],
          advancedParams: [{ field: 'timeout', paramValue: 3 }],
          advancedParamDefines: [{ field: 'timeout', type: 'number', name: 'Timeout', required: false }],
          scrapeParams: [{ field: 'sd_url', paramValue: 'https://sd.local/targets' }],
          scrapeParamDefines: [{ field: 'sd_url', type: 'text', name: 'HTTP SD URL', required: true }],
          collectors: ['collector-a']
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    const scrapeIndex = html.indexOf('data-monitor-editor-select="scrape"');
    const sdParamIndex = html.indexOf('data-monitor-editor-scrape-param-order="angular-after-scrape-before-name"');
    const nameIndex = html.indexOf('data-monitor-editor-input="name"');
    const mainParamIndex = html.indexOf('data-monitor-param-number-stepper="port"');
    const advancedIndex = html.indexOf('data-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"', mainParamIndex);
    const advancedToggleIndex = html.indexOf('data-monitor-editor-advanced-toggle="angular-dashed-collapse-trigger"', advancedIndex);
    const runtimeIndex = html.indexOf('data-monitor-editor-runtime-order="angular-after-advanced-before-labels"');
    const labelIndex = html.indexOf('data-monitor-editor-label-selector-owner="cold-label-selector"', runtimeIndex);

    expect(html).toContain('data-monitor-editor-field-order="angular-monitor-form-sequence"');
    expect(scrapeIndex).toBeGreaterThan(-1);
    expect(sdParamIndex).toBeGreaterThan(scrapeIndex);
    expect(nameIndex).toBeGreaterThan(sdParamIndex);
    expect(mainParamIndex).toBeGreaterThan(nameIndex);
    expect(advancedIndex).toBeGreaterThan(mainParamIndex);
    expect(advancedToggleIndex).toBeGreaterThan(advancedIndex);
    expect(runtimeIndex).toBeGreaterThan(advancedIndex);
    expect(labelIndex).toBeGreaterThan(runtimeIndex);
    expect(html).toContain('data-monitor-editor-advanced-collapse-state="collapsed"');
    expect(html).not.toContain('data-monitor-param-number-stepper="timeout"');
    expect(html).not.toContain('data-monitor-editor-advanced-fields="expanded"');
  });

  it('hides the Angular advanced collapse when every advanced param is dependency-hidden', () => {
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:80',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: 'example.com' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [{ field: 'token', paramValue: '', display: false }],
          advancedParamDefines: [{ field: 'token', type: 'text', name: 'Token', required: true, depend: { ssl: [true] } }],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
      />
    );

    expect(html).toContain('data-monitor-editor-advanced-visible-contract="angular-visible-param-only"');
    expect(html).not.toContain('data-monitor-editor-advanced-collapse-state=');
    expect(html).not.toContain('data-monitor-editor-advanced-toggle="angular-dashed-collapse-trigger"');
    expect(html).not.toContain('Token');
  });

  it('hides service-discovery params for static scrape to match Angular nonstatic-only rendering', () => {
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:80',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: 'example.com' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [{ field: 'sd_url', paramValue: 'https://sd.local/targets' }],
          scrapeParamDefines: [{ field: 'sd_url', type: 'text', name: 'HTTP SD URL', required: true }],
          collectors: []
        }}
        mode="edit"
      />
    );

    expect(html).toContain('data-monitor-editor-service-discovery-params="angular-nonstatic-only"');
    expect(html).toContain('data-monitor-editor-scrape-reload-contract="angular-reset-on-user-scrape-change"');
    expect(html).not.toContain('data-monitor-editor-scrape-param-order="angular-after-scrape-before-name"');
    expect(html).toContain('data-monitor-editor-static-host-field="angular-before-name"');
  });

  it('centers bottom monitor editor actions without repeating the editor title or ready badge', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'prometheus',
            name: '',
            instance: '',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: '127.0.0.1' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="new"
        returnContext={{ returnTo: '/monitors' }}
      />
    );
    const dockHtml = html.slice(html.indexOf('data-monitor-editor-action-dock="bottom"'));

    expect(dockHtml).toContain('data-hz-mutation-summary="hidden"');
    expect(dockHtml).toContain('data-hz-mutation-action-align="center"');
    expect(dockHtml).toContain('data-hz-ui="monitor-editor-action-bar"');
    expect(dockHtml).toContain('data-monitor-editor-action-bar-owner="hertzbeat-ui-monitor-editor-action-bar"');
    expect(dockHtml).toContain('data-monitor-editor-action="detect"');
    expect(dockHtml).toContain('data-monitor-editor-action="submit"');
    expect(dockHtml).toContain('data-monitor-editor-action="cancel"');
    expect(dockHtml).toContain('data-monitor-editor-detect-action="true"');
    expect(dockHtml).toContain('data-monitor-editor-submit-action="true"');
    expect(dockHtml).toContain('Detect');
    expect(dockHtml).toContain('OK');
    expect(dockHtml).toContain('Cancel');
    expect(dockHtml).not.toContain('New monitor');
    expect(dockHtml).not.toContain('data-hz-mutation-status-label=');
    expect(dockHtml).not.toContain('ready');
    expect(source).toContain('HzMonitorEditorActionBar');
    expect(source).toContain('summaryVisible={false}');
    expect(source).toContain('actionAlign="center"');
  });

  it('keeps missing app and name values editable without synthetic shell summaries', () => {
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: '',
            name: '',
            instance: '',
            scrape: '',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: '' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors' }}
      />
    );

    expect(html).toContain('data-monitor-editor-layout="linear"');
    expect(html).toContain('value=""');
    expect(html).not.toContain('data-monitor-editor-fact=');
    expect(html).not.toContain('data-monitor-editor-payload-row=');
    expect(html).not.toContain('App:-');
  });

  it('uses the shared HertzBeat UI number stepper for interval schedules instead of native number input', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:80',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: 'example.com' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    expect(html).toContain('data-monitor-interval-stepper="hertzbeat-ui-number-stepper"');
    expect(html).toContain('data-monitor-interval-stepper-contract="angular-min-step-max-by-app"');
    expect(html).toContain('data-monitor-interval-stepper-min="10"');
    expect(html).toContain('data-monitor-interval-stepper-max="604800"');
    expect(html).toContain('data-monitor-interval-stepper-step="10"');
    expect(html).toContain('min="10"');
    expect(html).toContain('max="604800"');
    expect(html).toContain('step="10"');
    expect(html).toContain('data-monitor-interval-stepper-unit="common.time.unit.second"');
    expect(html).toContain('data-monitor-editor-number-stepper-owner="hertzbeat-ui-number-stepper"');
    expect(html).toContain('data-hz-ui="number-stepper"');
    expect(html).toContain('data-hz-number-stepper-input="true"');
    expect(html).toContain('name="intervals"');
    expect(html).not.toContain('type="number"');
    expect(source).toContain('HzNumberStepper');
    expect(source).not.toContain("from '../ui/number-stepper'");
    expect(source).toContain('data-monitor-interval-stepper="hertzbeat-ui-number-stepper"');
    expect(source).not.toContain('data-cold-number-stepper-owner');
    expect(source).not.toContain('type="number"');
  });

  it('uses Angular push interval stepper bounds for push monitors', () => {
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'push',
            name: 'push-input',
            instance: 'push-input',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 1,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [],
          paramDefines: [],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=push' }}
      />
    );

    expect(html).toContain('data-monitor-interval-stepper-contract="angular-min-step-max-by-app"');
    expect(html).toContain('data-monitor-interval-stepper-min="1"');
    expect(html).toContain('data-monitor-interval-stepper-max="604800"');
    expect(html).toContain('data-monitor-interval-stepper-step="1"');
    expect(html).toContain('min="1"');
    expect(html).toContain('step="1"');
  });

  it('uses the shared HertzBeat UI textarea for monitor descriptions instead of the old editor row', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:80',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            description: 'Primary endpoint monitor',
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: 'example.com' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    expect(source).toContain('HzTextarea');
    expect(source).toContain('data-monitor-description-textarea="hertzbeat-ui-textarea"');
    expect(source).toContain('data-monitor-editor-textarea-owner="hertzbeat-ui-textarea"');
    expect(source).toContain('data-monitor-description-textarea-limit="angular-textarea-limit-100"');
    expect(source).toContain('maxCharacterCount={100}');
    expect(source).not.toContain("import { Textarea } from '@/components/ui/textarea';");
    expect(source).not.toContain("import { EditorRow } from '../observability/editor-rows';");
    expect(source).not.toContain('const textAreaClassName =');
    expect(html).toContain('data-monitor-description-textarea="hertzbeat-ui-textarea"');
    expect(html).toContain('data-monitor-editor-textarea-owner="hertzbeat-ui-textarea"');
    expect(html).toContain('data-monitor-description-textarea-limit="angular-textarea-limit-100"');
    expect(html).toContain('data-hz-ui="textarea"');
    expect(html).toContain('data-hz-ui="textarea-count"');
    expect(html).toContain('data-hz-textarea-count-max="100"');
    expect(html).toContain('data-hz-textarea-count-value="24/100"');
    expect(html).not.toContain('data-cold-textarea-owner="cold-textarea"');
    expect(html).toContain('Primary endpoint monitor');
  });

  it('uses the shared cold number stepper for numeric monitor parameters instead of native number input', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:443',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [
            { field: 'host', paramValue: 'example.com' },
            { field: 'port', paramValue: 443 }
          ],
          paramDefines: [
            { field: 'host', type: 'text', name: 'Host', required: true },
            { field: 'port', type: 'number', name: 'Port' }
          ],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    expect(html).toContain('data-monitor-param-number-stepper="port"');
    expect(html).toContain('data-monitor-param-number-contract="angular-nz-input-number--1000-65535-step-1"');
    expect(html).toContain('data-monitor-param-number-min="-1000"');
    expect(html).toContain('data-monitor-param-number-max="65535"');
    expect(html).toContain('data-monitor-param-number-step="1"');
    expect(html).toContain('data-monitor-editor-number-stepper-owner="hertzbeat-ui-number-stepper"');
    expect(html).toContain('data-hz-ui="number-stepper"');
    expect(html).toContain('data-hz-number-stepper-input="true"');
    expect(html).toContain('min="-1000"');
    expect(html).toContain('max="65535"');
    expect(html).toContain('step="1"');
    expect(html).not.toContain('type="number"');
    expect(source).toContain('HzNumberStepper');
    expect(source).toContain('data-monitor-param-number-stepper={define.field}');
    expect(source).toContain('data-monitor-param-number-contract="angular-nz-input-number--1000-65535-step-1"');
    expect(source).toContain('min={-1000}');
    expect(source).toContain('max={65535}');
    expect(source).toContain('step={1}');
    expect(source).not.toContain("from '../ui/number-stepper'");
    expect(source).not.toContain('data-cold-number-stepper-owner');
    expect(source).not.toContain("type={define.type === 'number' ? 'number' : 'text'}");
  });

  it('renders Angular boolean param definitions as shared switches instead of checkboxes', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:443',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'ssl', paramValue: true }],
          paramDefines: [{ field: 'ssl', type: 'boolean', name: 'SSL' }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    expect(html).toContain('data-monitor-param-switch="ssl"');
    expect(html).toContain('data-monitor-param-boolean-contract="angular-nz-switch"');
    expect(html).toContain('data-monitor-param-field="ssl"');
    expect(html).toContain('data-monitor-editor-switch-owner="hertzbeat-ui-switch"');
    expect(html).toContain('data-hz-ui="switch"');
    expect(html).toContain('data-hz-switch-control="button"');
    expect(html).toContain('data-hz-switch-checked="true"');
    expect(html).toContain('data-hz-switch-label="true"');
    expect(source).toContain('HzSwitch');
    expect(source).not.toContain("from '../ui/checkbox'");
    expect(source).not.toContain('data-cold-checkbox-owner');
    expect(source).toContain('data-monitor-param-switch={define.field}');
    expect(source).toContain('data-monitor-param-boolean-contract="angular-nz-switch"');
    expect(source).toContain('data-monitor-param-field={define.field}');
    expect(source).not.toContain('data-monitor-param-checkbox={define.field}');
    expect(source).not.toContain('<input type="checkbox" checked={Boolean(field.paramValue)}');
  });

  it('uses the shared HertzBeat UI checkbox for the Grafana dashboard enable switch', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'prometheus',
            name: 'prometheus',
            instance: 'prometheus:9090',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'host', paramValue: 'prometheus' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=prometheus' }}
      />
    );

    expect(html).toContain('data-monitor-grafana-enabled-checkbox="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-monitor-editor-checkbox="grafana-dashboard-enabled"');
    expect(html).toContain('data-monitor-editor-checkbox-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-hz-ui="checkbox"');
    expect(html).toContain('data-hz-checkbox-control="native-hidden"');
    expect(html).toContain('data-hz-checkbox-box="indicator"');
    expect(html).toContain('data-hz-checkbox-label="true"');
    expect(source).toContain('data-monitor-grafana-enabled-checkbox="hertzbeat-ui-checkbox"');
    expect(source).toContain('data-monitor-editor-checkbox="grafana-dashboard-enabled"');
    expect(source).not.toContain('data-cold-checkbox-owner');
    expect(source).not.toContain('type="checkbox"\n                    checked={Boolean(draft.grafanaDashboard.enabled)}');
  });

  it('uses the shared CodeMirror editor for the Grafana dashboard template instead of a raw editor row', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'prometheus',
            name: 'prometheus',
            instance: 'prometheus:9090',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: {
            enabled: true,
            template: '{"panels":[]}'
          },
          params: [{ field: 'host', paramValue: 'prometheus' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=prometheus' }}
      />
    );

    expect(html).toContain('data-monitor-editor-code-editor-owner="hertzbeat-ui-code-editor"');
    expect(html).toContain('data-monitor-editor-code-editor="grafana-dashboard-template"');
    expect(html).toContain('data-hz-ui="code-editor-frame"');
    expect(html).toContain('data-hz-code-editor-body="true"');
    expect(html).toContain('data-hz-code-editor-runtime="codemirror"');
    expect(html).toContain('data-hz-code-editor-language="json"');
    expect(html).toContain('data-hz-code-editor-license="codemirror-mit"');
    expect(html).toContain('data-monitor-grafana-code-editor="dashboard-template"');
    expect(html).toContain('data-mocked-codemirror="true"');
    expect(html).toContain('data-min-height="120px"');
    expect(html).toContain('name="grafana_dashboard_template"');
    expect(html).toContain('{&quot;panels&quot;:[]}');
    expect(source).not.toContain("from '../ui/cold-code-editor'");
    expect(source).toContain('HzCodeEditor');
    expect(source).toContain('data-monitor-editor-code-editor-owner="hertzbeat-ui-code-editor"');
    expect(source).toContain('data-monitor-editor-code-editor="grafana-dashboard-template"');
    expect(source).toContain('data-monitor-grafana-code-editor="dashboard-template"');
    expect(source).not.toContain('grafanaDashboard.enabled ? <EditorRow');
  });

  it('keeps the Angular Grafana JSON template upload wired through shared file input', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'prometheus',
            name: 'prometheus',
            instance: 'prometheus:9090',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: {
            enabled: true,
            template: '{"panels":[]}'
          },
          params: [{ field: 'host', paramValue: 'prometheus' }],
          paramDefines: [{ field: 'host', type: 'text', name: 'Host', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=prometheus' }}
      />
    );

    expect(html).toContain('data-monitor-grafana-template-input-contract="angular-json-template-upload"');
    expect(html).toContain('data-monitor-grafana-template-upload="angular-json-template-upload"');
    expect(html).toContain('data-monitor-grafana-template-upload-owner="hertzbeat-ui-file-input"');
    expect(html).toContain('data-monitor-grafana-template-upload-input="json-template"');
    expect(html).toContain('data-monitor-grafana-template-upload-trigger-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-monitor-grafana-template-upload-trigger="json-template"');
    expect(html).toContain('data-hz-ui="file-input"');
    expect(html).toContain('accept=".json,application/json"');
    expect(html).toContain('Upload Grafana Template');
    expect(source).toContain('HzFileInput');
    expect(source).toContain('async function handleGrafanaTemplateUpload');
    expect(source).toContain('file.text()');
    expect(source).toContain('setGrafanaTemplateText(template)');
    expect(source).toContain('template');
    expect(source).not.toContain('data-cold-file-input-owner');
  });

  it('renders Angular password param definitions as password inputs instead of exposing secrets as text', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'mysql',
            name: 'mysql-prod',
            instance: '127.0.0.1:3306',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: {
            enabled: false
          },
          params: [{ field: 'password', paramValue: 'secret' }],
          paramDefines: [{ field: 'password', type: 'password', name: 'Password', required: true }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=mysql' }}
      />
    );

    expect(html).toContain('data-monitor-param-password-input="password"');
    expect(html).toContain('data-monitor-param-password-contract="angular-app-multi-func-password"');
    expect(html).toContain('data-monitor-param-input="password"');
    expect(html).toContain('data-monitor-param-field="password"');
    expect(html).toContain('data-monitor-editor-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('type="password"');
    expect(source).toContain("if (define.type === 'password')");
    expect(source).toContain('data-monitor-param-password-contract="angular-app-multi-func-password"');
  });

  it('renders Angular textarea param definitions as multi-line shared textareas instead of single-line inputs', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'website-prod',
            instance: 'https://example.com',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: {
            enabled: false
          },
          params: [{ field: 'body', paramValue: 'line one\nline two' }],
          paramDefines: [{ field: 'body', type: 'textarea', name: 'Body', required: false }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    expect(html).toContain('data-monitor-param-textarea="body"');
    expect(html).toContain('data-monitor-param-textarea-contract="angular-nz-input-textarea-rows-8"');
    expect(html).toContain('data-monitor-param-field="body"');
    expect(html).toContain('data-monitor-editor-textarea-owner="hertzbeat-ui-textarea"');
    expect(html).toContain('data-hz-ui="textarea"');
    expect(html).toContain('data-hz-textarea-height="tall"');
    expect(html).not.toContain('data-monitor-param-input="body"');
    expect(source).toContain("if (define.type === 'textarea')");
    expect(source).toContain('data-monitor-param-textarea-contract="angular-nz-input-textarea-rows-8"');
  });

  it('renders Angular radio param definitions as shared button groups instead of select menus', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'website',
            name: 'checkout',
            instance: 'example.com:443',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'authType', paramValue: 'basic' }],
          paramDefines: [
            {
              field: 'authType',
              type: 'radio',
              name: 'Auth Type',
              options: [
                { label: 'Basic', value: 'basic' },
                { label: 'Bearer', value: 'bearer' }
              ]
            }
          ],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=website' }}
      />
    );

    expect(html).toContain('data-monitor-param-radio="authType"');
    expect(html).toContain('data-monitor-param-radio-contract="angular-nz-radio-group-button-solid"');
    expect(html).toContain('data-monitor-param-field="authType"');
    expect(html).toContain('data-monitor-editor-radio-owner="hertzbeat-ui-radio-button-group"');
    expect(html).toContain('data-hz-ui="radio-button-group"');
    expect(html).toContain('data-hz-radio-button-option="basic"');
    expect(html).toContain('data-hz-radio-button-option="bearer"');
    expect(html).toContain('data-hz-radio-button-checked="true"');
    expect(html).not.toContain('data-monitor-param-select="authType"');
    expect(source).toContain('HzRadioButtonGroup');
    expect(source).toContain('data-monitor-param-radio-contract="angular-nz-radio-group-button-solid"');
    expect(source).not.toContain('data-monitor-param-select={define.field}');
  });

  it('renders monitor key-value and array params as ordinary shared text controls instead of code editors', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'custom',
            name: 'custom monitor',
            instance: 'custom:8080',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [
            { field: 'headers', paramValue: '{\n  "Authorization": "Bearer token"\n}' },
            { field: 'targets', paramValue: '[\n  "checkout",\n  "orders"\n]' }
          ],
          paramDefines: [
            { field: 'headers', type: 'key-value', name: 'Headers', keyAlias: 'Header Name', valueAlias: 'Header Value' },
            { field: 'targets', type: 'array', name: 'Targets' }
          ],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=custom' }}
      />
    );

    expect(html).toContain('data-monitor-param-key-value-editor="headers"');
    expect(html).toContain('data-monitor-param-array-input="targets"');
    expect(html).toContain('data-hz-ui="key-value-editor"');
    expect(html).toContain('data-hz-key-value-input="key"');
    expect(html).toContain('data-hz-key-value-input="value"');
    expect(html).toContain('placeholder="Header Name"');
    expect(html).toContain('placeholder="Header Value"');
    expect(html).toContain('value="Authorization"');
    expect(html).toContain('value="Bearer token"');
    expect(html).toContain('&quot;checkout&quot;');
    expect(html).not.toContain('data-monitor-param-code-editor="key-value"');
    expect(html).not.toContain('data-monitor-param-code-editor="array"');
    expect(html).not.toContain('data-mocked-codemirror="true"');
    expect(source).toContain('HzCodeEditor');
    expect(source).toContain('data-monitor-grafana-code-editor="dashboard-template"');
    expect(source).toContain('data-monitor-param-key-value-editor={define.field}');
    expect(source).toContain('data-monitor-param-array-input={define.field}');
    expect(source).not.toContain('data-monitor-param-code-editor={define.type}');
  });

  it('renders Angular labels params as configurable key/value rows instead of a plain text input', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'custom',
            name: 'custom monitor',
            instance: 'custom:8080',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'labels', paramValue: { team: 'platform', env: 'prod' } }],
          paramDefines: [{ field: 'labels', type: 'labels', name: 'Labels' }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=custom' }}
      />
    );

    expect(html).toContain('data-monitor-param-labels-editor="labels"');
    expect(html).toContain('data-monitor-param-labels-contract="angular-app-configurable-field-key-value"');
    expect(html).toContain('data-monitor-param-field="labels"');
    expect(html).toContain('data-monitor-editor-labels-owner="hertzbeat-ui-key-value-editor"');
    expect(html).toContain('data-monitor-param-labels-input="key"');
    expect(html).toContain('data-monitor-param-labels-input="value"');
    expect(html).toContain('data-hz-ui="key-value-editor"');
    expect(html).toContain('value="team"');
    expect(html).toContain('value="platform"');
    expect(html).toContain('value="env"');
    expect(html).toContain('value="prod"');
    expect(html).not.toContain('data-monitor-param-input="labels"');
    expect(source).toContain("if (define.type === 'labels')");
    expect(source).toContain('data-monitor-param-labels-editor={define.field}');
    expect(source).toContain('data-monitor-param-labels-contract="angular-app-configurable-field-key-value"');
    expect(source).toContain("keyInputProps={{ 'data-monitor-param-labels-input': 'key' }}");
    expect(source).not.toContain("define.type === 'labels' ? 'text'");
  });

  it('renders Angular metrics-field params as three-column configurable rows instead of a plain text input', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorEditorSurface
        initial={{
          monitor: {
            id: 42,
            app: 'custom',
            name: 'custom monitor',
            instance: 'custom:8080',
            scrape: 'static',
            scheduleType: 'interval',
            intervals: 60,
            status: 1,
            labels: {},
            annotations: {}
          } as any,
          collector: '',
          grafanaDashboard: { enabled: false },
          params: [{ field: 'metrics', paramValue: [{ field: 'usage', unit: '%', type: 'number' }] }],
          paramDefines: [{ field: 'metrics', type: 'metrics-field', name: 'Metrics' }],
          advancedParams: [],
          advancedParamDefines: [],
          scrapeParams: [],
          scrapeParamDefines: [],
          collectors: []
        }}
        mode="edit"
        returnContext={{ returnTo: '/monitors?app=custom' }}
      />
    );

    expect(html).toContain('data-monitor-param-metrics-field-editor="metrics"');
    expect(html).toContain('data-monitor-param-metrics-field-contract="angular-app-configurable-field-field-unit-type"');
    expect(html).toContain('data-monitor-param-field="metrics"');
    expect(html).toContain('data-monitor-editor-metrics-field-owner="hertzbeat-ui-configurable-field-editor"');
    expect(html).toContain('data-monitor-param-metrics-field-input="field"');
    expect(html).toContain('data-monitor-param-metrics-field-input="unit"');
    expect(html).toContain('data-monitor-param-metrics-field-input="type"');
    expect(html).toContain('data-hz-ui="configurable-field-editor"');
    expect(html).toContain('placeholder="Field"');
    expect(html).toContain('placeholder="Unit"');
    expect(html).toContain('placeholder="Type"');
    expect(html).toContain('value="usage"');
    expect(html).toContain('value="%"');
    expect(html).toContain('value="number"');
    expect(html).not.toContain('data-monitor-param-input="metrics"');
    expect(source).toContain("if (define.type === 'metrics-field')");
    expect(source).toContain('HzConfigurableFieldEditor');
    expect(source).toContain('data-monitor-param-metrics-field-editor={define.field}');
    expect(source).toContain('data-monitor-param-metrics-field-contract="angular-app-configurable-field-field-unit-type"');
    expect(source).not.toContain("define.type === 'metrics-field' ? 'text'");
  });
});
