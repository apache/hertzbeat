/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAlertRuleDraft, periodicLogStarterExpression } from '../model/alert-rule-model';
import editorStyles from '../shared/alert-rule-editor.module.css?raw';
import { AlertRuleFields } from './alert-rule-fields';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Alert Rule strategy fields', () => {
  afterEach(cleanup);

  it('renders the Apache master real-time metric authoring fields', () => {
    const actions = renderFields(
      {
        kind: 'ready',
        status: { hasPromqlExecutor: true, hasSqlExecutor: true }
      },
      { kind: 'realtime', dataType: 'metric' }
    );

    expect(screen.getByLabelText('alertRules.name')).toBeRequired();
    expect(screen.getByRole('radio', { name: 'alertRules.dataType.metric' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'alertRules.dataType.log' })).not.toBeChecked();
    expect(screen.getByRole('combobox', { name: 'alertRules.metricTarget.type' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'alertRules.severity.label' })).toBeRequired();
    expect(screen.getByLabelText('alertRules.template')).toBeRequired();
    expect(screen.getByText('alertRules.finalExpression')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'alertRules.finalExpression' })).toHaveTextContent('');
    expect(screen.getByText('alertRules.name').closest('[data-alert-rule-label]')).toHaveTextContent(
      '*alertRules.name:'
    );
    expect(screen.getByLabelText('alertRules.help.name')).toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.help.dataType')).toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.help.target')).toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.help.template')).toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.help.enable')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'alertRules.finalExpression' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-icon="line-chart"]')).toBeInTheDocument();
    expect(document.querySelector('[data-icon="file-text"]')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'alertRules.dataType.log' }));
    expect(actions.changeDataType).toHaveBeenCalledWith('log');
  });

  it('reproduces the 1.8.0 periodic PromQL editor and delegates inline preview', () => {
    const actions = renderFields(
      {
        kind: 'ready',
        status: { hasPromqlExecutor: true, hasSqlExecutor: true }
      },
      { kind: 'periodic', dataType: 'metric' }
    );

    fireEvent.change(screen.getByLabelText('alertRules.expression'), { target: { value: 'up == 0' } });
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.preview' }));

    expect(screen.getByRole('radio', { name: 'alertRules.query.promql' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'alertRules.query.sql' })).toBeDisabled();
    expect(screen.getByLabelText('alertRules.expression')).toHaveAttribute('rows', '3');
    expect(screen.getByLabelText('alertRules.expression')).toHaveAttribute('maxlength', '100');
    expect(screen.getByLabelText('alertRules.expression')).toHaveAttribute(
      'placeholder',
      'alertRules.query.promqlPlaceholder'
    );
    expect(screen.queryByText('alertRules.query.expression')).not.toBeInTheDocument();
    expect(screen.getByText('alertRules.query.promqlDescription')).toBeInTheDocument();
    expect(screen.getByText('alertRules.query.examples')).toBeInTheDocument();
    expect(screen.getByText('cpu_usage > 80')).toBeInTheDocument();
    expect(screen.getByText('cpu_usage{instance="server1"} > 80')).toBeInTheDocument();
    expect(screen.getByText('rate(http_requests_total[5m]) > 100')).toBeInTheDocument();
    expect(screen.getByText('cpu > 80 and memory > 70')).toBeInTheDocument();
    expect(screen.getByText('0/100')).toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.period')).toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.period')).toHaveAttribute('placeholder', 'alertRules.periodPlaceholder');
    expect(screen.getByLabelText('alertRules.help.queryMetric')).toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.help.period')).toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.times')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'alertRules.template' })).toHaveAttribute(
      'placeholder',
      'alertRules.templatePlaceholder'
    );
    expect(screen.getByText('0/200')).toBeInTheDocument();
    expect(actions.update).toHaveBeenCalledWith({ expr: 'up == 0' });
    expect(actions.preview).toHaveBeenCalledOnce();
  });

  it('reproduces the 1.8.0 periodic SQL editor surface', () => {
    renderFields(
      {
        kind: 'ready',
        status: { hasPromqlExecutor: true, hasSqlExecutor: true }
      },
      { kind: 'periodic', dataType: 'log', expr: periodicLogStarterExpression }
    );

    expect(screen.getByRole('radio', { name: 'alertRules.query.promql' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'alertRules.query.sql' })).toBeChecked();
    expect(screen.getByLabelText('alertRules.help.queryLog')).toBeInTheDocument();
    expect(document.querySelector('[data-hb-alert-sql-editor="codemirror"]')).toHaveStyle({ height: '150px' });
    expect(screen.getByRole('textbox', { name: 'alertRules.expression' })).toHaveTextContent('SELECT count(*)');
    expect(screen.getByText('alertRules.query.sqlDescription')).toBeInTheDocument();
    expect(screen.getByText('alertRules.query.examples')).toBeInTheDocument();
    expect(screen.getByText("SELECT COUNT(*) FROM hertzbeat_logs WHERE severity_text = 'ERROR'")).toBeInTheDocument();
    expect(
      screen.getByText('SELECT service_name, COUNT(*) FROM hertzbeat_logs GROUP BY service_name')
    ).toBeInTheDocument();
    expect(
      screen.getByText("SELECT * FROM hertzbeat_logs WHERE time_unix_nano >= NOW() - INTERVAL '5 minute'")
    ).toBeInTheDocument();
  });

  it('renders the Apache master visual log-condition authoring workflow', () => {
    const actions = renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      {
        kind: 'realtime',
        dataType: 'log',
        expr: '',
        labelsText: 'severity:warning, alert_mode:group'
      }
    );

    expect(screen.getByRole('radio', { name: 'alertRules.metricCondition.structured' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'alertRules.metricCondition.expert' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.metricCondition.addCondition' }));

    expect(actions.update).toHaveBeenCalledWith({ expr: 'log.timeUnixNano > undefined' });
    expect(screen.getByRole('combobox', { name: 'alertRules.metricCondition.field' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'alertRules.mode.label' })).toBeRequired();
  });

  it('keeps severity, alert content, labels, annotations, and enablement explicit', async () => {
    const actions = renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      { template: '', labelsText: '' }
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'alertRules.severity.label' }));
    expect(await screen.findByRole('option', { name: 'alert.severity.critical' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /\$\{__instance__\}/ }));

    expect(actions.update).toHaveBeenCalledWith({ template: '${__instance__}' });
    expect(screen.getByText('alertRules.annotations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'alertRules.map.addLabel' })).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'alertRules.enabledThreshold' })).toBeChecked();
  });

  it('reproduces the searchable canonical and custom label selector', async () => {
    renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      { labelsText: 'severity:warning' },
      [],
      undefined,
      {
        kind: 'received',
        keys: ['environment', 'team'],
        catalog: {
          keys: ['environment', 'team'],
          valuesByKey: { environment: ['production', 'staging'], team: ['platform'] }
        }
      }
    );

    const keySelector = screen.getByRole('combobox', { name: 'alertRules.map.key' }).closest('.ant-select-selector');
    fireEvent.mouseDown(keySelector!);
    expect(await screen.findByRole('option', { name: 'environment' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'team' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'alertRules.map.addLabel' })).toBeEnabled();
  });

  it('reproduces the unselected required severity and log alert-mode state', () => {
    renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      { kind: 'realtime', dataType: 'log', labelsText: '' },
      ['severity', 'alertMode']
    );

    expect(screen.getByText('alertRules.severity.placeholder')).toBeInTheDocument();
    expect(screen.getByText('alertRules.mode.placeholder')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'alertRules.severity.label' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox', { name: 'alertRules.mode.label' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('alertRules.window')).toHaveAttribute('placeholder', 'alertRules.windowPlaceholder');
    expect(screen.getAllByText('alertRules.required')).toHaveLength(2);
  });

  it('keeps data type selection exclusive to the new-rule flow', () => {
    renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      {
        persisted: {
          type: 'realtime_metric',
          datasource: null,
          expr: 'linux.cpu.usage > 90',
          period: 300,
          times: 3,
          labels: { severity: 'warning' },
          template: 'CPU usage is high'
        }
      }
    );

    expect(screen.queryByRole('radio', { name: 'alertRules.dataType.metric' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'alertRules.dataType.log' })).not.toBeInTheDocument();
  });

  it('reproduces the Apache master draggable variable layout', () => {
    renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      { kind: 'realtime', dataType: 'metric' }
    );

    const token = screen.getByRole('button', { name: /\$\{__instance__\}/ });
    expect(token).toHaveAttribute('draggable', 'true');
    expect(editorStyles).toMatch(
      /\.variableList\s*\{[^}]*max-height:\s*480px;[^}]*overflow-y:\s*auto;[^}]*gap:\s*10px;[^}]*border:\s*1px dashed var\(--ant-color-primary-border\);[^}]*margin-bottom:\s*16px;[^}]*padding:\s*12px;/s
    );
    expect(editorStyles).toMatch(
      /\.variableButton:global\(\.ant-btn\)\s*\{[^}]*min-width:\s*140px;[^}]*padding:\s*8px 12px;[^}]*cursor:\s*move;[^}]*transition:\s*all 0\.2s cubic-bezier\(0\.645, 0\.045, 0\.355, 1\);/s
    );
  });

  it('adds selected metric fields to the message-template palette', () => {
    renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      {
        kind: 'realtime',
        dataType: 'metric',
        metricEditor: {
          kind: 'targeted',
          app: 'springboot3',
          target: { kind: 'metric', app: 'springboot3', metric: 'summary' },
          monitorIds: [],
          monitorLabels: [],
          authoring: { mode: 'structured', condition: { kind: 'group', join: 'and', items: [] } }
        }
      },
      [],
      {
        apps: {
          kind: 'ready',
          apps: [{ category: 'application', value: 'springboot3', label: 'Spring Boot 3' }]
        },
        hierarchy: {
          kind: 'ready',
          hierarchy: {
            category: 'application',
            value: 'springboot3',
            label: 'Spring Boot 3',
            isLeaf: false,
            hide: false,
            type: null,
            unit: null,
            children: [
              {
                category: null,
                value: 'summary',
                label: 'Summary',
                isLeaf: false,
                hide: false,
                type: null,
                unit: null,
                children: [
                  {
                    category: null,
                    value: 'responseTime',
                    label: 'Response time',
                    isLeaf: true,
                    hide: false,
                    type: 0,
                    unit: 'ms',
                    children: []
                  }
                ]
              }
            ]
          }
        }
      }
    );

    expect(screen.getByRole('button', { name: /\$\{responseTime\} Response time/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\$\{__row__\} alertRules.metricTarget.rowCount/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'alertRules.template' })).toHaveAttribute('maxlength', '200');
  });

  it('exposes the complete source log-field catalog to the message-template palette', () => {
    renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      { kind: 'realtime', dataType: 'log' }
    );

    expect(screen.getByRole('button', { name: /\$\{log\.timeUnixNano\} Time \(Unix Nano\)/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /\$\{log\.instrumentationScope\.droppedAttributesCount\} Instrumentation Scope Dropped Attributes Count/
      })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /\$\{log\./ })).toHaveLength(15);
  });

  it('drops a variable at the textarea selection and keeps click insertion available', () => {
    const actions = renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      { kind: 'realtime', dataType: 'metric', template: 'left right' }
    );
    const token = screen.getByRole('button', { name: /\$\{__instance__\}/ });
    const textarea = screen.getByRole('textbox', { name: 'alertRules.template' });
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('expected template textarea');
    const transfer = createDataTransfer();

    textarea.setSelectionRange(4, 5);
    fireEvent.dragStart(token, { dataTransfer: transfer });
    textarea.setSelectionRange(0, 0);
    fireEvent.dragOver(textarea, { dataTransfer: transfer });
    fireEvent.drop(textarea, { dataTransfer: transfer });

    expect(transfer.setData).toHaveBeenCalledWith('text/plain', '${__instance__}');
    expect(actions.update).toHaveBeenCalledWith({ template: 'left${__instance__}right' });
    fireEvent.click(token);
    expect(actions.update).toHaveBeenCalledWith({ template: 'left right${__instance__}' });
  });

  it('does not let variable insertion bypass the 200-character template limit', () => {
    const actions = renderFields(
      { kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: true } },
      { kind: 'realtime', dataType: 'metric', template: 'x'.repeat(199) }
    );

    fireEvent.click(screen.getByRole('button', { name: /\$\{__instance__\}/ }));

    expect(actions.update).not.toHaveBeenCalledWith(expect.objectContaining({ template: expect.any(String) }));
  });
});

function createDataTransfer() {
  const values = new Map<string, string>();
  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    getData: vi.fn((type: string) => values.get(type) ?? ''),
    setData: vi.fn((type: string, value: string) => values.set(type, value))
  };
}

function renderFields(
  datasource: Parameters<typeof AlertRuleFields>[0]['datasource'],
  patch: Partial<ReturnType<typeof createAlertRuleDraft>> = {},
  invalidFields: Parameters<typeof AlertRuleFields>[0]['invalidFields'] = [],
  metricTarget: Parameters<typeof AlertRuleFields>[0]['metricTarget'] = {
    apps: { kind: 'idle' },
    hierarchy: { kind: 'idle' }
  },
  labelSuggestions: Parameters<typeof AlertRuleFields>[0]['labelSuggestions'] = {
    kind: 'received',
    keys: [],
    catalog: { keys: [], valuesByKey: {} }
  }
) {
  const changeDataType = vi.fn();
  const update = vi.fn();
  const preview = vi.fn();
  render(
    <AlertRuleFields
      draft={{ ...createAlertRuleDraft(), ...patch }}
      busy={false}
      datasource={datasource}
      metricBindings={{
        eligible: false,
        open: false,
        evidence: { kind: 'idle' },
        selectedMonitorIds: [],
        selectedLabels: []
      }}
      metricTarget={metricTarget}
      labelSuggestions={labelSuggestions}
      update={update}
      changeDataType={changeDataType}
      changeMetricAuthoringMode={vi.fn()}
      changeMetricBindingIds={vi.fn()}
      changeMetricBindingLabels={vi.fn()}
      changeMetricExpertCondition={vi.fn()}
      changeMetricStructuredCondition={vi.fn()}
      changeMetricTarget={vi.fn()}
      openMetricBindings={vi.fn()}
      cancelMetricBindings={vi.fn()}
      confirmMetricBindings={vi.fn()}
      retryMetricBindings={vi.fn()}
      retryMetricTargetApps={vi.fn()}
      retryMetricTargetHierarchy={vi.fn()}
      preview={preview}
      previewLoading={false}
      invalidFields={invalidFields}
    />
  );
  return { changeDataType, update, preview };
}
