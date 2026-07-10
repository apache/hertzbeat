// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AlertSettingCreateDialog,
  buildAlertSettingDraftFromDefine,
  buildAlertSettingCreatePayload,
  buildAlertSettingCreateValidation,
  createDefaultAlertSettingDraft,
  resolveAlertSettingCreateDatasource,
  serializeAlertSettingCreatePayload,
  type AlertSettingCreateDraft
} from './alert-setting-create-dialog';
import { createTranslatorMock } from '../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/hz-code-editor', () => ({
  HzCodeEditor: ({ value, language, minHeight, onChange: _onChange, ...props }: any) => (
    <div
      data-alert-setting-code-editor={props['data-alert-setting-code-editor']}
      data-hz-code-editor="codemirror"
      data-hz-code-editor-language={language}
      data-hz-code-editor-min-height={minHeight}
    >
      {props.name ? <input type="hidden" name={props.name} value={value} /> : null}
      {value}
    </div>
  )
}));

vi.mock('../workbench/overlay-dialog', () => ({
  OverlayDialog: ({ open, title, kicker, footer, children }: any) =>
    open ? (
      <div data-overlay-dialog="true">
        <div>{kicker}</div>
        <div>{title}</div>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null
}));

describe('AlertSettingCreateDialog', () => {
  let interactionContainer: HTMLDivElement | null = null;
  let interactionRoot: Root | null = null;

  afterEach(async () => {
    await act(async () => {
      interactionRoot?.unmount();
      await Promise.resolve();
    });
    interactionRoot = null;
    interactionContainer?.remove();
    interactionContainer = null;
  });

  const t = createTranslatorMock({ locale: 'zh-CN' });
  const enT = createTranslatorMock({ locale: 'en-US' });
  const draft: AlertSettingCreateDraft = {
    name: 'CPU high load',
    kind: 'periodic',
    dataType: 'metric',
    datasource: 'promql',
    expr: 'cpu_usage > 80',
    template: 'CPU usage too high',
    labelsText: 'severity:critical, service:checkout',
    enable: true,
    period: '300',
    times: '3',
    priority: '2'
  };

  it('renders the cold threshold type selection before authoring', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-setting-create-dialog.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="type"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={draft}
        submitting={false}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-create-dialog="type-select"');
    expect(html).toContain('data-alert-setting-create-capability-status="realtime-ready-periodic-ready"');
    expect(html).toContain('data-alert-setting-create-capability-owner="threshold-type-gate"');
    expect(html).toContain('data-alert-setting-create-periodic-capability="ready"');
    expect(html).toContain('data-alert-setting-create-capability-item="realtime"');
    expect(html).toContain('data-alert-setting-create-capability-item="periodic"');
    expect(html).toContain('data-alert-setting-create-type-selector="step-list"');
    expect(html).toContain('data-alert-setting-command-action="select-realtime"');
    expect(html).toContain('data-alert-setting-command-action="select-periodic"');
    expect(html).toContain('data-alert-setting-command-action="type-cancel"');
    expect(html).toContain('data-alert-setting-create-option="realtime"');
    expect(html).toContain('data-alert-setting-create-option="periodic"');
    expect(html).toContain('data-alert-setting-create-type-step="realtime"');
    expect(html).toContain('data-alert-setting-create-type-step="periodic"');
    expect(html.match(/data-alert-setting-create-type-visual="step-row-no-card"/g)?.length).toBe(2);
    expect(html.match(/data-alert-setting-create-type-icon="borderless"/g)?.length).toBe(2);
    expect(html).toContain('data-alert-setting-create-periodic-disabled="false"');
    expect(html.match(/data-alert-setting-create-type-help-key="/g)?.length).toBe(2);
    expect(html.match(/data-alert-authoring-field-help-trigger="hertzbeat-ui-field-help"/g)?.length).toBe(2);
    expect(html).toContain('data-alert-setting-create-type-help-key="realtime"');
    expect(html).toContain('data-alert-setting-create-type-help-key="periodic"');
    expect(html).toContain(t('alert.setting.create.realtime.help'));
    expect(html).toContain(t('alert.setting.create.realtime.impact'));
    expect(html).toContain(t('alert.setting.create.periodic.help'));
    expect(html).toContain(t('alert.setting.create.periodic.impact'));
    expect(html).toContain(t('alert.setting.capability.realtime.ready'));
    expect(html).toContain(t('alert.setting.capability.periodic.ready'));
    expect(html).toContain(t('alert.setting.create.title.type'));
    expect(html).toContain(t('alert.setting.create.realtime.title'));
    expect(html).toContain(t('alert.setting.create.periodic.title'));
    expect(html).not.toContain('data-alert-setting-create-type-card=');
    expect(source).toContain('data-alert-setting-create-type-selector="step-list"');
    expect(source).toContain('data-alert-setting-create-type-icon="borderless"');
    expect(source).not.toContain('data-alert-setting-create-type-card');
    expect(source).not.toContain('rounded-[3px] border border-[#334056] bg-[#0d1017]');
  });

  it('explains blocked periodic threshold capability before users choose a type', () => {
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="type"
        datasourceStatus={{ code: 1, msg: 'executor unavailable', data: {} }}
        draft={draft}
        submitting={false}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-create-capability-status="realtime-ready-periodic-blocked"');
    expect(html).toContain('data-alert-setting-create-periodic-capability="blocked"');
    expect(html).toContain('data-alert-setting-create-periodic-disabled="true"');
    expect(html).toContain(t('alert.setting.capability.realtime.ready'));
    expect(html).toContain(t('alert.setting.capability.periodic.blocked'));
  });

  it('renders a cold single-column threshold authoring form with shared controls', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-setting-create-dialog.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={draft}
        submitting={false}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-create-dialog="authoring"');
    expect(html).toContain('data-alert-setting-create-layout="single-column"');
    expect(html).toContain('data-alert-setting-command-action="back-to-type"');
    expect(html).toContain('data-alert-setting-command-action="cancel"');
    expect(html).toContain('data-alert-setting-command-action="save"');
    expect(html).toContain('data-alert-setting-create-field-row="name"');
    expect(html).toContain('data-alert-setting-create-field-row="type"');
    expect(html).toContain('data-alert-setting-create-field-row="expression"');
    expect(html).toContain('data-alert-setting-create-field-row="content"');
    expect(html).toContain('data-alert-setting-create-field-row="labels"');
    expect(html).toContain('data-alert-setting-create-field-row="period"');
    expect(html).toContain('data-alert-setting-create-field-row="times"');
    expect(html).toContain('data-alert-setting-create-field-row="priority"');
    expect(html).toContain('data-alert-setting-create-field-row="enable"');
    expect(html.match(/data-alert-setting-create-field-title="/g)?.length).toBe(9);
    expect(html.match(/data-alert-authoring-field-help-trigger="hertzbeat-ui-field-help"/g)?.length).toBe(9);
    expect(html.match(/data-alert-authoring-field-help="hertzbeat-ui-field-tooltip"/g)?.length).toBe(9);
    expect(html.match(/data-alert-authoring-field-help-placement="inline-label"/g)?.length).toBe(9);
    expect(html.match(/data-alert-setting-create-field-requirement="required"/g)?.length).toBe(8);
    expect(html.match(/data-alert-setting-create-field-requirement="optional"/g)?.length).toBe(1);
    expect(html.match(/data-alert-setting-create-field-input-mode="manual"/g)?.length).toBe(7);
    expect(html.match(/data-alert-setting-create-field-input-mode="selection"/g)?.length).toBe(2);
    expect(html).toContain(t('alert.setting.field.requirement.required'));
    expect(html).toContain(t('alert.setting.field.requirement.optional'));
    expect(html).toContain(t('alert.setting.field.input-mode.manual'));
    expect(html).toContain(t('alert.setting.field.input-mode.selection'));
    expect(html).toContain('data-alert-setting-create-field-help="expression"');
    expect(html).toContain('data-alert-setting-create-field-help="period"');
    expect(html).toContain('data-alert-setting-create-field-help="enable"');
    expect(html).toContain(t('alert.setting.field.periodic-expression.help'));
    expect(html).toContain(t('alert.setting.field.times.impact'));
    expect(html).toContain(t('alert.setting.field.enable.help'));
    expect(html).toContain('name="alert_define_name"');
    expect(html).toContain('name="alert_define_expr"');
    expect(html).toContain('name="alert_define_template"');
    expect(html).toContain('data-alert-setting-code-editor="threshold-expression"');
    expect(html).toContain('data-alert-setting-code-editor="alert-template"');
    expect(html).toContain('data-hz-code-editor="codemirror"');
    expect(html).toContain('data-hz-code-editor-language="javascript"');
    expect(html).toContain('data-hz-code-editor-language="text"');
    expect(html).toContain('data-hz-segmented-control-owner="hertzbeat-ui-segmented-control"');
    expect(html).toContain('data-hz-number-stepper-owner="hertzbeat-ui-number-stepper"');
    expect(html).toContain(`${t('common.decrement')} ${t('alert.setting.period')}`);
    expect(html).toContain(`${t('common.increment')} ${t('alert.setting.period')}`);
    expect(html).toContain(`${t('common.decrement')} ${t('alert.setting.times')}`);
    expect(html).toContain(`${t('common.increment')} ${t('alert.setting.times')}`);
    expect(html).toContain(`${t('common.decrement')} ${t('alert.setting.priority')}`);
    expect(html).toContain(`${t('common.increment')} ${t('alert.setting.priority')}`);
    expect(html).toContain('data-hz-label-selector-owner="hertzbeat-ui-label-selector"');
    expect(html).toContain('data-hz-checkbox-owner="hertzbeat-ui-checkbox"');
    expect(html).not.toContain('md:grid-cols-2');
    expect(source).toContain('buildAlertSettingCreatePayload');
    expect(source).toContain("from '../ui/hz-code-editor'");
    expect(source).toContain('data-alert-setting-code-editor="threshold-expression"');
    expect(source).toContain('data-alert-setting-code-editor="alert-template"');
    expect(source).toContain('data-alert-setting-create-validation="hertzbeat-ui-validation-feedback"');
    expect(source).toContain('data-alert-setting-create-validation-count');
    expect(source).toContain('data-alert-setting-create-validation-list="required-fields"');
    expect(source).toContain('data-alert-setting-create-field-error="name"');
    expect(source).toContain('data-alert-setting-create-field-error="expr"');
    expect(source).toContain('data-alert-setting-create-field-error="template"');
    expect(source).toContain('data-alert-setting-create-field-invalid');
    expect(source).toContain('AlertSettingCreateFieldTitle');
    expect(source).toContain('alertSettingFieldHelp');
    expect(source).toContain('AlertAuthoringInlineHelp');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-invalid={validationIssueFor');
    expect(source).toContain('aria-describedby={validationIssueFor');
    expect(source).toContain('buildAlertSettingCreateValidation(t, draft)');
    expect(source).toContain("t('alert.setting.validation.name')");
    expect(source).toContain("t('alert.setting.validation.expr')");
    expect(source).toContain("t('alert.setting.validation.template')");
    expect(source).not.toMatch(/setValidationMessage\('\u89c4\u5219\u540d\u79f0\u4e3a\u5fc5\u586b\u9879'\)/);
    expect(source).not.toMatch(/setValidationMessage\('\u9608\u503c\u8868\u8fbe\u5f0f\u4e3a\u5fc5\u586b\u9879'\)/);
    expect(source).not.toMatch(/setValidationMessage\('\u544a\u8b66\u5185\u5bb9\u4e3a\u5fc5\u586b\u9879'\)/);
    expect(source).not.toContain('<textarea');
    expect(source).not.toContain('router.push');
  });

  it('keeps realtime threshold authoring field help without showing periodic-only period controls', () => {
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={{
          ...draft,
          kind: 'realtime',
          dataType: 'metric'
        }}
        submitting={false}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-create-field-row="name"');
    expect(html).toContain('data-alert-setting-create-field-row="type"');
    expect(html).toContain('data-alert-setting-create-field-row="expression"');
    expect(html).toContain('data-alert-setting-create-field-row="content"');
    expect(html).toContain('data-alert-setting-create-field-row="labels"');
    expect(html).toContain('data-alert-setting-create-field-row="times"');
    expect(html).toContain('data-alert-setting-create-field-row="priority"');
    expect(html).toContain('data-alert-setting-create-field-row="enable"');
    expect(html).not.toContain('data-alert-setting-create-field-row="period"');
    expect(html.match(/data-alert-authoring-field-help-trigger="hertzbeat-ui-field-help"/g)?.length).toBe(8);
    expect(html.match(/data-alert-setting-create-field-requirement="required"/g)?.length).toBe(7);
    expect(html.match(/data-alert-setting-create-field-requirement="optional"/g)?.length).toBe(1);
    expect(html.match(/data-alert-setting-create-field-input-mode="manual"/g)?.length).toBe(6);
    expect(html.match(/data-alert-setting-create-field-input-mode="selection"/g)?.length).toBe(2);
    expect(html).toContain(t('alert.setting.field.realtime-expression.help'));
    expect(html).toContain(t('alert.setting.field.realtime-type.help'));
    expect(html).not.toContain(t('alert.setting.field.periodic-expression.help'));
  });

  it('renders threshold preview action and source-backed sample rows inside authoring', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-setting-create-dialog.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={draft}
        submitting={false}
        previewFeedback={{
          tone: 'success',
          title: t('alert.setting.preview.success.title', { count: 1 }),
          description: t('alert.setting.preview.success.description'),
          rows: [{ __value__: 0.92, service_name: 'checkout', operation: '/pay' }],
          contract: 'success'
        }}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-preview-action="true"');
    expect(html).toContain('data-alert-setting-preview-action-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-alert-setting-command-action="preview"');
    expect(html).toContain(t('alert.setting.preview.action'));
    expect(html).toContain('data-alert-setting-preview-evidence="success"');
    expect(html).toContain('data-alert-setting-preview-evidence-owner="hertzbeat-ui-evidence-chain"');
    expect(html).toContain('data-alert-setting-preview-evidence-rows-count="1"');
    expect(html).toContain('data-alert-setting-preview-evidence-rows-total="1"');
    expect(html).toContain('data-alert-setting-preview-evidence-rows-rendered="1"');
    expect(html).toContain('data-alert-setting-preview-evidence-rows-limit="3"');
    expect(html).toContain('data-alert-setting-preview-evidence-steps="state-data-write"');
    expect(html).toContain('data-alert-setting-preview-evidence-step="state"');
    expect(html).toContain('data-alert-setting-preview-evidence-step="data"');
    expect(html).toContain('data-alert-setting-preview-evidence-step="write"');
    expect(html).toContain('data-alert-setting-preview-feedback="success"');
    expect(html).toContain('data-alert-setting-preview-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-setting-preview-rows="query-result-sample"');
    expect(html).toContain('data-alert-setting-preview-rows-owner="hertzbeat-ui-inline-preview"');
    expect(html).toContain(t('alert.setting.preview.evidence.title'));
    expect(html).toContain(t('alert.setting.preview.evidence.state.success'));
    expect(html).toContain(t('alert.setting.preview.evidence.write.enabled.success'));
    expect(html).toContain('__value__');
    expect(html).toContain('checkout');
    expect(source).toContain('onPreview?.(buildAlertSettingCreatePayload(draft))');
    expect(source).toContain("t('alert.setting.preview.action')");
    expect(source).toContain("t('alert.setting.preview.loading')");
    expect(source).toContain('data-alert-setting-preview-evidence={previewEvidenceContract}');
    expect(source).toContain('resolvePreviewEvidenceWriteImpactKey(previewEvidenceContract, draft)');
  });

  it('renders bounded preview samples while preserving total returned row evidence', () => {
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={draft}
        submitting={false}
        previewFeedback={{
          tone: 'success',
          title: t('alert.setting.preview.success.title', { count: 40 }),
          description: t('alert.setting.preview.success.description'),
          rows: [
            { __value__: 0.1, service_name: 'checkout-1' },
            { __value__: 0.2, service_name: 'checkout-2' },
            { __value__: 0.3, service_name: 'checkout-3' }
          ],
          totalRows: 40,
          sampleLimit: 3,
          contract: 'success'
        }}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-preview-evidence-rows-total="40"');
    expect(html).toContain('data-alert-setting-preview-evidence-rows-rendered="3"');
    expect(html).toContain('data-alert-setting-preview-evidence-rows-limit="3"');
    expect(html).toContain('data-alert-setting-preview-evidence-rows-overflow="37"');
    expect(html).toContain('checkout-1');
    expect(html).toContain('checkout-3');
    expect(html).not.toContain('data-alert-setting-preview-row="3"');
  });

  it('warns enabled rule authors before saving without preview evidence', () => {
    const enabledHtml = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={{ ...draft, enable: true }}
        submitting={false}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );
    const disabledHtml = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={{ ...draft, enable: false }}
        submitting={false}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(enabledHtml).toContain('data-alert-setting-preview-missing-enabled="save-without-sample-evidence"');
    expect(enabledHtml).toContain('data-alert-setting-preview-missing-enabled-owner="hertzbeat-ui-inline-feedback"');
    expect(enabledHtml).toContain(t('alert.setting.preview.missing-enabled.title'));
    expect(enabledHtml).toContain(t('alert.setting.preview.missing-enabled.description'));
    expect(enabledHtml).not.toContain('data-alert-setting-save-disabled-reason="failed-preview-enabled"');
    expect(disabledHtml).not.toContain('data-alert-setting-preview-missing-enabled="save-without-sample-evidence"');
  });

  it('renders no-data preview evidence without sample rows and describes disabled save impact', () => {
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={{ ...draft, enable: false }}
        submitting={false}
        previewFeedback={{
          tone: 'warning',
          title: t('alert.setting.preview.empty.title'),
          description: t('alert.setting.preview.empty.description'),
          rows: [],
          contract: 'empty'
        }}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-preview-evidence="empty"');
    expect(html).toContain('data-alert-setting-preview-evidence-rows-count="0"');
    expect(html).toContain(t('alert.setting.preview.evidence.state.empty'));
    expect(html).toContain(t('alert.setting.preview.evidence.write.disabled'));
    expect(html).not.toContain('data-alert-setting-preview-rows="query-result-sample"');
  });

  it('renders loading preview evidence while the backend check is running', () => {
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={draft}
        submitting={false}
        previewing
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-preview-evidence="loading"');
    expect(html).toContain(t('alert.setting.preview.loading.title'));
    expect(html).toContain(t('alert.setting.preview.loading.description'));
    expect(html).toContain(t('alert.setting.preview.evidence.write.loading'));
  });

  it('keeps failed preview evidence actionable without leaking backend internals', () => {
    const backendDetail = 'Realtime alert expression is invalid: org.apache.hertzbeat.common.util.JexlExpressionRunner.compile:84@1:18 parsing error in ==';
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={draft}
        submitting={false}
        previewFeedback={{
          tone: 'critical',
          title: t('alert.setting.preview.failed.title'),
          description: backendDetail,
          rows: [],
          contract: 'failed'
        }}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-preview-evidence="failed"');
    expect(html).toContain(t('alert.setting.preview.evidence.data.failed'));
    expect(html).not.toContain(backendDetail);
    expect(html).not.toContain('JexlExpressionRunner');
    expect(html).toContain(t('alert.setting.preview.evidence.write.enabled.failed'));
    expect(html).toContain('data-alert-setting-save-disabled-reason="failed-preview-enabled"');
    expect(html).toContain('data-alert-setting-save-preview-state="failed"');
    expect(html).toContain('data-alert-setting-preview-save-blocked="failed-preview-enabled"');
    expect(html).toContain('data-alert-setting-preview-save-blocked-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-setting-preview-save-blocked-state="failed"');
    expect(html).toContain(t('alert.setting.preview.save-blocked.title'));
  });

  it('allows a disabled rule draft to be saved after failed preview evidence', () => {
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={{ ...draft, enable: false }}
        submitting={false}
        previewFeedback={{
          tone: 'critical',
          title: t('alert.setting.preview.failed.title'),
          description: 'invalid query',
          rows: [],
          contract: 'failed'
        }}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-preview-evidence="failed"');
    expect(html).toContain(t('alert.setting.preview.evidence.write.disabled'));
    expect(html).toContain('data-alert-setting-save-preview-state="failed"');
    expect(html).not.toContain('data-alert-setting-save-disabled-reason="failed-preview-enabled"');
    expect(html).not.toContain('data-alert-setting-preview-save-blocked=');
  });

  it('blocks enabled saves when realtime metric preview is unsupported', () => {
    const enabledHtml = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={{ ...draft, kind: 'realtime', dataType: 'metric', enable: true }}
        submitting={false}
        previewFeedback={{
          tone: 'warning',
          title: t('alert.setting.preview.unsupported.title'),
          description: t('alert.setting.preview.unsupported.description'),
          rows: [],
          contract: 'unsupported'
        }}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );
    const disabledHtml = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={{ ...draft, kind: 'realtime', dataType: 'metric', enable: false }}
        submitting={false}
        previewFeedback={{
          tone: 'warning',
          title: t('alert.setting.preview.unsupported.title'),
          description: t('alert.setting.preview.unsupported.description'),
          rows: [],
          contract: 'unsupported'
        }}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    expect(enabledHtml).toContain('data-alert-setting-preview-evidence="unsupported"');
    expect(enabledHtml).toContain('data-alert-setting-save-disabled-reason="unsupported-preview-enabled"');
    expect(enabledHtml).toContain('data-alert-setting-save-preview-state="unsupported"');
    expect(enabledHtml).toContain('data-alert-setting-preview-save-blocked="unsupported-preview-enabled"');
    expect(enabledHtml).toContain('data-alert-setting-preview-save-blocked-state="unsupported"');
    expect(enabledHtml).toContain(t('alert.setting.preview.save-blocked.title'));
    expect(disabledHtml).toContain('data-alert-setting-preview-evidence="unsupported"');
    expect(disabledHtml).not.toContain('data-alert-setting-save-disabled-reason="unsupported-preview-enabled"');
    expect(disabledHtml).not.toContain('data-alert-setting-preview-save-blocked=');
  });

  it('blocks enabled alert saves after failed preview evidence but lets disabled drafts save', async () => {
    const onSubmit = vi.fn();
    const failedPreviewFeedback = {
      tone: 'critical' as const,
      title: t('alert.setting.preview.failed.title'),
      description: 'invalid query',
      rows: [],
      contract: 'failed' as const
    };
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    const renderDialog = (nextDraft: AlertSettingCreateDraft) => interactionRoot?.render(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={nextDraft}
        submitting={false}
        previewFeedback={failedPreviewFeedback}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={onSubmit}
        onPreview={vi.fn()}
      />
    );

    await act(async () => {
      renderDialog({ ...draft, enable: true });
      await Promise.resolve();
    });

    const blockedSave = interactionContainer.querySelector(
      'button[data-alert-setting-save-action="true"]'
    ) as HTMLButtonElement | null;
    expect(blockedSave?.disabled).toBe(true);
    expect(blockedSave?.getAttribute('data-alert-setting-save-disabled-reason')).toBe('failed-preview-enabled');
    expect(blockedSave?.getAttribute('data-alert-setting-save-preview-state')).toBe('failed');
    expect(interactionContainer.querySelector('[data-alert-setting-preview-evidence="failed"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-alert-setting-preview-save-blocked="failed-preview-enabled"]')).not.toBeNull();

    await act(async () => {
      blockedSave?.click();
      await Promise.resolve();
    });

    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      renderDialog({ ...draft, enable: false });
      await Promise.resolve();
    });

    const allowedSave = interactionContainer.querySelector(
      'button[data-alert-setting-save-action="true"]'
    ) as HTMLButtonElement | null;
    expect(allowedSave?.disabled).toBe(false);
    expect(allowedSave?.getAttribute('data-alert-setting-save-disabled-reason')).toBeNull();
    expect(allowedSave?.getAttribute('data-alert-setting-save-preview-state')).toBe('failed');
    expect(interactionContainer.querySelector('[data-alert-setting-preview-save-blocked]')).toBeNull();

    await act(async () => {
      allowedSave?.click();
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      enable: false,
      expr: draft.expr,
      template: draft.template
    }));
  });

  it('renders Angular title/detail feedback for threshold save failures inside the authoring modal', () => {
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={draft}
        submitting={false}
        saveFeedback={{
          tone: 'critical',
          title: 'common.notify.new-fail',
          description: 'backend-message',
          contract: 'create'
        }}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-save-failure="angular-notify-title-detail"');
    expect(html).toContain('data-alert-setting-save-failure-intent="create"');
    expect(html).toContain('data-alert-setting-save-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-alert-setting-save-feedback-title="common.notify.new-fail"');
    expect(html).toContain('data-alert-setting-save-feedback-detail="backend-message"');
    expect(html).toContain('backend-message');
  });

  it('builds one shared validation result for save and preview authoring gates', () => {
    const emptyDraft = {
      ...draft,
      name: '',
      expr: '',
      template: ''
    };

    expect(buildAlertSettingCreateValidation(t, emptyDraft)).toEqual([
      { field: 'name', message: t('alert.setting.validation.name') },
      { field: 'expr', message: t('alert.setting.validation.expr') },
      { field: 'template', message: t('alert.setting.validation.template') }
    ]);

    expect(buildAlertSettingCreateValidation(t, {
      ...emptyDraft,
      name: 'CPU high load',
      expr: 'cpu_usage > 80'
    })).toEqual([
      { field: 'template', message: t('alert.setting.validation.template') }
    ]);
  });

  it('moves focus into threshold authoring and then to the first invalid field after save validation', async () => {
    const emptyDraft: AlertSettingCreateDraft = {
      ...draft,
      name: '',
      expr: '',
      template: ''
    };
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertSettingCreateDialog
          t={t}
          open
          mode="authoring"
          datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
          draft={emptyDraft}
          submitting={false}
          onClose={vi.fn()}
          onSelectType={vi.fn()}
          onDraftChange={vi.fn()}
          onBackToType={vi.fn()}
          onSubmit={vi.fn()}
          onPreview={vi.fn()}
        />
      );
      await new Promise(resolve => window.setTimeout(resolve, 0));
    });

    const nameInput = interactionContainer.querySelector('input[name="alert_define_name"]') as HTMLInputElement | null;
    expect(document.activeElement).toBe(nameInput);

    const saveButton = interactionContainer.querySelector('button[data-alert-setting-save-action="true"]') as HTMLButtonElement | null;
    await act(async () => {
      saveButton?.focus();
      saveButton?.click();
      await new Promise(resolve => window.setTimeout(resolve, 0));
    });

    expect(interactionContainer.querySelector('[data-alert-setting-create-validation-count="3"]')).not.toBeNull();
    expect(nameInput?.getAttribute('aria-invalid')).toBe('true');
    expect(nameInput?.getAttribute('aria-describedby')).toBe('alert-setting-create-name-validation');
    expect(document.activeElement).toBe(nameInput);
  });

  it('moves focus into threshold type selection when opened', async () => {
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertSettingCreateDialog
          t={t}
          open
          mode="type"
          datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
          draft={draft}
          submitting={false}
          onClose={vi.fn()}
          onSelectType={vi.fn()}
          onDraftChange={vi.fn()}
          onBackToType={vi.fn()}
          onSubmit={vi.fn()}
        />
      );
      await new Promise(resolve => window.setTimeout(resolve, 0));
    });

    expect(document.activeElement).toBe(interactionContainer.querySelector('[data-alert-setting-create-option="realtime"]'));
  });

  it('keeps a troubleshooting return link in the threshold authoring footer', () => {
    const html = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={draft}
        submitting={false}
        evidenceReturnHref="/trace/manage?traceId=trace-123"
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-setting-editor-return="evidence-context"');
    expect(html).toContain('data-alert-setting-command-action="return-to-evidence"');
    expect(html).toContain('href="/trace/manage?traceId=trace-123"');
    expect(html).toContain(t('alert.rule.evidence.return'));
  });

  it('localizes visible threshold authoring copy outside zh-CN', () => {
    const localizedDraft = {
      ...draft,
      name: 'CPU load'
    };
    const typeHtml = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={enT}
        open
        mode="type"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={localizedDraft}
        submitting={false}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    const authoringHtml = renderToStaticMarkup(
      <AlertSettingCreateDialog
        t={enT}
        open
        mode="authoring"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={localizedDraft}
        submitting
        evidenceReturnHref="/trace/manage?traceId=trace-123"
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(typeHtml).toContain('New threshold rule');
    expect(typeHtml).toContain('Realtime threshold');
    expect(typeHtml).toContain('Periodic threshold');
    expect(authoringHtml).toContain('New periodic threshold');
    expect(authoringHtml).toContain('Rule name');
    expect(authoringHtml).toContain('Threshold expression');
    expect(authoringHtml).toContain('Alert content');
    expect(authoringHtml).toContain('Names this threshold rule');
    expect(authoringHtml).toContain('Datasource query executed on the configured schedule');
    expect(authoringHtml).toContain('Return to troubleshooting context');
    expect(`${typeHtml} ${authoringHtml}`).not.toMatch(/[\u4e00-\u9fff]/);
    expect(`${typeHtml} ${authoringHtml}`).not.toContain('alert.setting.create');
  });

  it('builds the backend alert define payload with compatible defaults', () => {
    expect(buildAlertSettingCreatePayload({
      ...draft,
      kind: 'periodic',
      dataType: 'trace'
    })).toEqual({
      name: 'CPU high load',
      type: 'periodic_trace',
      datasource: 'sql',
      expr: 'cpu_usage > 80',
      template: 'CPU usage too high',
      labels: {
        severity: 'critical',
        service: 'checkout'
      },
      annotations: {},
      enable: true,
      period: 300,
      times: 3,
      priority: 2
    });
  });

  it('serializes threshold payloads with stable label ordering for dirty checks', () => {
    const left = buildAlertSettingCreatePayload({
      ...draft,
      labelsText: 'service:checkout, severity:critical'
    });
    const right = buildAlertSettingCreatePayload({
      ...draft,
      labelsText: 'severity:critical, service:checkout'
    });

    expect(serializeAlertSettingCreatePayload(left)).toBe(serializeAlertSettingCreatePayload(right));
  });

  it('disables no-change edit saves and re-enables after the draft changes', async () => {
    const onSubmit = vi.fn();
    const editDraft = buildAlertSettingDraftFromDefine({
      id: 7,
      name: 'CPU high load',
      type: 'realtime_metric',
      datasource: 'promql',
      expr: 'cpu_usage > 80',
      template: 'CPU usage too high',
      labels: { severity: 'critical', service: 'checkout' },
      enable: true,
      period: 300,
      times: 3,
      priority: 2
    });
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    const renderDialog = (nextDraft: AlertSettingCreateDraft) => interactionRoot?.render(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        intent="edit"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={nextDraft}
        submitting={false}
        onClose={vi.fn()}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await act(async () => {
      renderDialog(editDraft);
      await Promise.resolve();
    });

    const unchangedDialog = interactionContainer.querySelector('[data-alert-setting-create-dialog="authoring"]');
    const unchangedSave = interactionContainer.querySelector(
      'button[data-alert-setting-save-action="true"]'
    ) as HTMLButtonElement | null;
    expect(unchangedDialog?.getAttribute('data-alert-setting-create-change-state')).toBe('unchanged');
    expect(unchangedSave?.disabled).toBe(true);
    expect(unchangedSave?.getAttribute('data-alert-setting-save-dirty')).toBe('unchanged');
    expect(unchangedSave?.getAttribute('data-alert-setting-save-disabled-reason')).toBe('unchanged-edit');
    expect(interactionContainer.querySelector('[data-alert-setting-edit-no-changes="save-disabled"]')).not.toBeNull();

    await act(async () => {
      renderDialog({ ...editDraft, name: 'CPU high load edited' });
      await Promise.resolve();
    });

    const changedDialog = interactionContainer.querySelector('[data-alert-setting-create-dialog="authoring"]');
    const changedSave = interactionContainer.querySelector(
      'button[data-alert-setting-save-action="true"]'
    ) as HTMLButtonElement | null;
    expect(changedDialog?.getAttribute('data-alert-setting-create-change-state')).toBe('changed');
    expect(changedSave?.disabled).toBe(false);
    expect(changedSave?.getAttribute('data-alert-setting-save-dirty')).toBe('changed');
    expect(changedSave?.getAttribute('data-alert-setting-save-disabled-reason')).toBeNull();

    await act(async () => {
      changedSave?.click();
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      id: 7,
      name: 'CPU high load edited'
    }));
  });

  it('confirms before discarding dirty edit drafts', async () => {
    const onClose = vi.fn();
    const editDraft = buildAlertSettingDraftFromDefine({
      id: 7,
      name: 'CPU high load',
      type: 'realtime_metric',
      datasource: 'promql',
      expr: 'cpu_usage > 80',
      template: 'CPU usage too high',
      labels: { severity: 'critical', service: 'checkout' },
      enable: true,
      period: 300,
      times: 3,
      priority: 2
    });
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    const renderDialog = (nextDraft: AlertSettingCreateDraft) => interactionRoot?.render(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        intent="edit"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={nextDraft}
        submitting={false}
        onClose={onClose}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    await act(async () => {
      renderDialog(editDraft);
      await Promise.resolve();
    });

    await act(async () => {
      renderDialog({ ...editDraft, name: 'CPU high load edited' });
      await Promise.resolve();
    });

    const cancel = interactionContainer.querySelector(
      'button[data-alert-setting-unsaved-cancel-trigger="dirty"]'
    ) as HTMLButtonElement | null;
    expect(cancel).not.toBeNull();

    await act(async () => {
      cancel?.click();
      await Promise.resolve();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(interactionContainer.querySelector('[data-alert-setting-unsaved-cancel-state="open"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-alert-setting-unsaved-cancel-dialog="hertzbeat-ui-confirm-dialog"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-alert-setting-unsaved-cancel-copy="true"]')?.textContent).toBe(
      t('alert.setting.unsaved-cancel.copy')
    );

    await act(async () => {
      (interactionContainer.querySelector(
        'button[data-alert-setting-unsaved-cancel-keep-editing="true"]'
      ) as HTMLButtonElement | null)?.click();
      await Promise.resolve();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(interactionContainer.querySelector('[data-alert-setting-unsaved-cancel-state="closed"]')).not.toBeNull();

    await act(async () => {
      cancel?.click();
      await Promise.resolve();
    });

    await act(async () => {
      (interactionContainer.querySelector(
        'button[data-alert-setting-unsaved-cancel-confirm="true"]'
      ) as HTMLButtonElement | null)?.click();
      await Promise.resolve();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('confirms before discarding dirty create drafts but lets blank create drafts close', async () => {
    const onClose = vi.fn();
    const blankCreateDraft = createDefaultAlertSettingDraft('realtime');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    const renderDialog = (nextDraft: AlertSettingCreateDraft) => interactionRoot?.render(
      <AlertSettingCreateDialog
        t={t}
        open
        mode="authoring"
        intent="create"
        datasourceStatus={{ code: 0, data: { hasPromqlExecutor: true } }}
        draft={nextDraft}
        submitting={false}
        onClose={onClose}
        onSelectType={vi.fn()}
        onDraftChange={vi.fn()}
        onBackToType={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    await act(async () => {
      renderDialog(blankCreateDraft);
      await Promise.resolve();
    });

    const cleanCancel = interactionContainer.querySelector(
      'button[data-alert-setting-unsaved-cancel-trigger="clean"]'
    ) as HTMLButtonElement | null;
    expect(cleanCancel).not.toBeNull();

    await act(async () => {
      cleanCancel?.click();
      await Promise.resolve();
    });

    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();

    await act(async () => {
      renderDialog({ ...blankCreateDraft, name: 'Checkout CPU threshold' });
      await Promise.resolve();
    });

    const dirtyCancel = interactionContainer.querySelector(
      'button[data-alert-setting-unsaved-cancel-trigger="dirty"]'
    ) as HTMLButtonElement | null;
    expect(dirtyCancel).not.toBeNull();

    await act(async () => {
      dirtyCancel?.click();
      await Promise.resolve();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(interactionContainer.querySelector('[data-alert-setting-unsaved-cancel-state="open"]')).not.toBeNull();
    expect(interactionContainer.querySelector('[data-alert-setting-unsaved-cancel-dialog="hertzbeat-ui-confirm-dialog"]')).not.toBeNull();
  });

  it('routes periodic log and trace authoring through the SQL datasource by default', () => {
    expect(resolveAlertSettingCreateDatasource('periodic', 'metric')).toBe('promql');
    expect(resolveAlertSettingCreateDatasource('periodic', 'log')).toBe('sql');
    expect(resolveAlertSettingCreateDatasource('periodic', 'trace')).toBe('sql');
    expect(resolveAlertSettingCreateDatasource('realtime', 'log')).toBe('promql');

    expect(createDefaultAlertSettingDraft('periodic', {
      kind: 'realtime',
      dataType: 'log',
      datasource: 'promql'
    }).datasource).toBe('sql');
  });

  it('maps an existing backend alert define into the cold authoring draft for edit', () => {
    const editDraft = buildAlertSettingDraftFromDefine({
      id: 7,
      name: 'trace error threshold',
      type: 'periodic_trace',
      datasource: 'promql',
      expr: 'span_error_total > 0',
      template: 'Trace errors detected',
      labels: { severity: 'critical', service: 'checkout' },
      enable: false,
      period: 600,
      times: 2,
      priority: 1
    });

    expect(editDraft).toEqual({
      id: 7,
      name: 'trace error threshold',
      kind: 'periodic',
      dataType: 'trace',
      datasource: 'promql',
      expr: 'span_error_total > 0',
      template: 'Trace errors detected',
      labelsText: 'severity:critical, service:checkout',
      enable: false,
      period: '600',
      times: '2',
      priority: '1'
    });

    expect(buildAlertSettingCreatePayload(editDraft)).toEqual({
      id: 7,
      name: 'trace error threshold',
      type: 'periodic_trace',
      datasource: 'sql',
      expr: 'span_error_total > 0',
      template: 'Trace errors detected',
      labels: {
        severity: 'critical',
        service: 'checkout'
      },
      annotations: {},
      enable: false,
      period: 600,
      times: 2,
      priority: 1
    });
  });
});
