import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MonitorEditorSurface } from './monitor-editor-surface';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock(),
    locale: 'en-US'
  })
}));

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
  WorkbenchPage: ({ kicker, title, subtitle, actions, main, side }: any) => (
    <main>
      <div>{kicker}</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{actions}</div>
      <div>{main}</div>
      <aside>{side}</aside>
    </main>
  ),
  RowList: ({ rows }: any) => (
    <div>
      {rows.map((row: any, index: number) => (
        <div key={`${row.title}-${index}`}>{`${row.title}:${row.copy}`}</div>
      ))}
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('@/lib/monitor-editor/controller', () => ({
  createMonitor: vi.fn(),
  detectMonitor: vi.fn(),
  loadMonitorScrapeDraft: vi.fn(),
  syncMonitorDependentDisplay: (draft: any) => draft,
  updateMonitor: vi.fn(),
  updateMonitorEditorParam: (draft: any, kind: string, index: number, value: unknown) => ({
    ...draft,
    [kind]: draft[kind].map((row: any, rowIndex: number) => (rowIndex === index ? { ...row, paramValue: value } : row))
  }),
  validateMonitorEditorDraft: vi.fn(() => null)
}));

vi.mock('@/lib/monitor-editor/navigation', () => ({
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
    expect(html).toContain('<form');
    expect(html).toContain('team');
    expect(html).toContain('platform');
    expect(html).toContain('owner');
    expect(html).toContain('sre');
    expect(html).not.toContain('JSON object for monitor labels.');
    expect(html).not.toContain('JSON object for monitor annotations.');
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

  it('uses the shared cold number stepper for interval schedules instead of native number input', () => {
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

    expect(html).toContain('data-monitor-interval-stepper="cold-number-stepper"');
    expect(html).toContain('data-cold-number-stepper-owner="cold-number-stepper"');
    expect(html).toContain('data-cold-number-stepper-input="true"');
    expect(html).toContain('name="intervals"');
    expect(html).not.toContain('type="number"');
    expect(source).toContain("from '../ui/number-stepper'");
    expect(source).toContain('data-monitor-interval-stepper="cold-number-stepper"');
    expect(source).not.toContain('type="number"');
  });

  it('uses the shared cold textarea for monitor descriptions instead of the old editor row', () => {
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

    expect(source).toContain("import { Textarea } from '@/components/ui/textarea';");
    expect(source).toContain('data-monitor-description-textarea="cold-textarea"');
    expect(source).not.toContain("import { EditorRow } from '../observability/editor-rows';");
    expect(source).not.toContain('const textAreaClassName =');
    expect(html).toContain('data-monitor-description-textarea="cold-textarea"');
    expect(html).toContain('data-cold-textarea-owner="cold-textarea"');
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
    expect(html).toContain('data-cold-number-stepper-owner="cold-number-stepper"');
    expect(html).toContain('data-cold-number-stepper-input="true"');
    expect(html).not.toContain('type="number"');
    expect(source).toContain('data-monitor-param-number-stepper={define.field}');
    expect(source).not.toContain("type={define.type === 'number' ? 'number' : 'text'}");
  });

  it('uses the shared cold checkbox for boolean monitor parameters instead of page-local checkbox chrome', () => {
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

    expect(html).toContain('data-monitor-param-checkbox="ssl"');
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-control="native-hidden"');
    expect(html).toContain('data-cold-checkbox-box="indicator"');
    expect(html).toContain('data-cold-checkbox-label="true"');
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('data-monitor-param-checkbox={define.field}');
    expect(source).not.toContain('<input type="checkbox" checked={Boolean(field.paramValue)}');
  });

  it('uses the shared cold checkbox for the Grafana dashboard enable switch', () => {
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

    expect(html).toContain('data-monitor-grafana-enabled-checkbox="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-control="native-hidden"');
    expect(html).toContain('data-cold-checkbox-box="indicator"');
    expect(html).toContain('data-cold-checkbox-label="true"');
    expect(source).toContain('data-monitor-grafana-enabled-checkbox="cold-checkbox"');
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

    expect(html).toContain('data-monitor-grafana-code-editor="dashboard-template"');
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="json"');
    expect(html).toContain('name="grafana_dashboard_template"');
    expect(html).toContain('{&quot;panels&quot;:[]}');
    expect(source).toContain("from '../ui/cold-code-editor'");
    expect(source).toContain('data-monitor-grafana-code-editor="dashboard-template"');
    expect(source).not.toContain('grafanaDashboard.enabled ? <EditorRow');
  });

  it('uses the shared CodeMirror editor for structured monitor parameter values', () => {
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
            { field: 'headers', type: 'key-value', name: 'Headers' },
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

    expect(html).toContain('data-monitor-param-code-editor="key-value"');
    expect(html).toContain('data-monitor-param-code-editor="array"');
    expect(html).toContain('data-monitor-param-field="headers"');
    expect(html).toContain('data-monitor-param-field="targets"');
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="json"');
    expect(html).toContain('&quot;Authorization&quot;');
    expect(html).toContain('&quot;checkout&quot;');
    expect(source).toContain('data-monitor-param-code-editor={define.type}');
    expect(source).toContain('data-monitor-param-field={define.field}');
    expect(source).toContain('onChange={nextValue => onChange(nextValue)}');
  });
});
