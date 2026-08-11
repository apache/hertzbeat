/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App } from 'antd';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MonitorParamDefine } from '../model/monitor-contract';
import { createMonitorEditorDraft } from '../model/monitor-editor-draft';
import { MonitorEditorFormView } from './monitor-editor-form-view';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }) }));

afterEach(cleanup);

describe('Monitor editor guidance parity', () => {
  it('explains the task name and Host while preserving the static MySQL field order', () => {
    const defines = [
      define('host', 'host', 'Target Host'),
      define('port', 'number', 'Port'),
      define('timeout', 'number', 'Timeout', true),
      define('database', 'text', 'Database Name'),
      define('username', 'text', 'Username'),
      define('password', 'password', 'Password')
    ].map(item => ({ ...item, app: 'mysql' }));
    const controller = editorController(defines, 'mysql');

    render(<MonitorEditorFormView mode="new" controller={controller} />);

    expect(screen.getByLabelText('Target Host')).toHaveAttribute('placeholder', 'monitor.editor.hostPlaceholder');
    expect(screen.getByLabelText('monitor.name')).toHaveAttribute('placeholder', 'monitor.editor.namePlaceholder');
    const ordered = [
      screen.getByText('monitor.application'),
      screen.getByText('monitor.editor.scrape'),
      screen.getByText('Target Host'),
      screen.getByText('monitor.name'),
      screen.getByText('Port'),
      screen.getByText('Database Name'),
      screen.getByText('Username'),
      screen.getByText('Password'),
      screen.getByText('monitor.editor.advanced'),
      screen.getByText('monitor.editor.collector'),
      screen.getByText('monitor.editor.schedule'),
      screen.getByText('monitor.editor.interval')
    ];
    ordered.slice(1).forEach((item, index) => {
      expect(ordered[index]!.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('keeps field and detect guidance visible and bounds the description', () => {
    const controller = editorController([define('headers', 'key-value', 'Headers')]);

    render(<MonitorEditorFormView mode="new" controller={controller} />);

    for (const key of ['collectorHelp', 'intervalHelp']) {
      expect(document.querySelector(`[data-monitor-field-help="monitor.editor.${key}"]`)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'monitor.editor.detect' })).toHaveAttribute(
      'title',
      'monitor.editor.detectHelp'
    );

    fireEvent.click(screen.getByRole('button', { name: 'monitor.editor.showMetadata' }));
    for (const key of ['labelsHelp', 'annotationsHelp', 'descriptionHelp']) {
      expect(document.querySelector(`[data-monitor-field-help="monitor.editor.${key}"]`)).toBeInTheDocument();
    }
    expect(screen.getByRole('textbox', { name: 'monitor.editor.descriptionLabel' })).toHaveAttribute(
      'maxlength',
      '100'
    );
  });

  it('keeps advanced and Grafana guidance visible from the corresponding controls', () => {
    const defines = [
      define('headers', 'key-value', 'Headers', false, 'prometheus'),
      define('timeout', 'number', 'Timeout', true, 'prometheus')
    ];
    const controller = editorController(defines, 'prometheus');
    const rendered = render(
      <App>
        <MonitorEditorFormView mode="new" controller={controller} />
      </App>
    );

    expect(document.querySelector('[data-monitor-field-help="monitor.editor.advancedHelp"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'monitor.editor.showMetadata' }));
    expect(document.querySelector('[data-monitor-field-help="monitor.editor.grafanaEnabledHelp"]')).toBeInTheDocument();
    controller.state.draft.grafanaDashboard.enabled = true;
    rendered.rerender(
      <App>
        <MonitorEditorFormView mode="new" controller={controller} />
      </App>
    );
    expect(
      document.querySelector('[data-monitor-field-help="monitor.editor.grafanaTemplateHelp"]')
    ).toBeInTheDocument();
  });
});

function define(field: string, type: string, name: string, hide = false, app = 'website'): MonitorParamDefine {
  return {
    id: null,
    app,
    field,
    name: { 'en-US': name },
    type,
    required: field === 'host',
    defaultValue: null,
    placeholder: null,
    range: type === 'number' ? '[0,65535]' : null,
    limit: null,
    options: null,
    keyAlias: null,
    valueAlias: null,
    depend: null,
    hide
  };
}

function editorController(defines: MonitorParamDefine[], app = 'website') {
  const draft = createMonitorEditorDraft(undefined, app, 'static', defines);
  return {
    state: {
      evidence: { kind: 'ready' as const },
      draft,
      defines,
      apps: [{ category: 'service', value: app, label: app }],
      collectors: [],
      busy: false,
      command: 'idle' as const,
      feedback: null,
      validationIssues: [],
      returnTo: '/monitors',
      scrapeValues: ['static'] as const,
      sourceKey: `new:${app}:static`,
      labelSuggestions: undefined
    },
    actions: {
      updateMonitor: vi.fn(),
      updateCollector: vi.fn(),
      updateGrafana: vi.fn(),
      updateParam: vi.fn(),
      setParamValid: vi.fn(),
      changeSource: vi.fn(),
      detect: vi.fn(),
      save: vi.fn(),
      cancel: vi.fn(),
      retry: vi.fn()
    }
  };
}
