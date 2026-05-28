import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  AlertSettingCreateDialog,
  buildAlertSettingDraftFromDefine,
  buildAlertSettingCreatePayload,
  type AlertSettingCreateDraft
} from './alert-setting-create-dialog';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/cold-code-editor', () => ({
  ColdCodeEditor: ({ value, language, minHeight, onChange: _onChange, ...props }: any) => (
    <div
      data-alert-setting-code-editor={props['data-alert-setting-code-editor']}
      data-cold-code-editor="codemirror"
      data-cold-code-editor-language={language}
      data-cold-code-editor-min-height={minHeight}
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
  const t = createTranslatorMock({ locale: 'zh-CN' });
  const enT = createTranslatorMock({ locale: 'en-US' });
  const draft: AlertSettingCreateDraft = {
    name: 'CPU 高负载',
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
    expect(html).toContain('data-alert-setting-create-option="realtime"');
    expect(html).toContain('data-alert-setting-create-option="periodic"');
    expect(html).toContain('data-alert-setting-create-periodic-disabled="false"');
    expect(html).toContain('新增阈值');
    expect(html).toContain('实时阈值');
    expect(html).toContain('周期阈值');
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
    expect(html).toContain('name="alert_define_name"');
    expect(html).toContain('name="alert_define_expr"');
    expect(html).toContain('name="alert_define_template"');
    expect(html).toContain('data-alert-setting-code-editor="threshold-expression"');
    expect(html).toContain('data-alert-setting-code-editor="alert-template"');
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="javascript"');
    expect(html).toContain('data-cold-code-editor-language="text"');
    expect(html).toContain('data-cold-segmented-control-owner="cold-segmented-control"');
    expect(html).toContain('data-cold-number-stepper-owner="cold-number-stepper"');
    expect(html).toContain('data-cold-label-selector-owner="cold-label-selector"');
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).not.toContain('md:grid-cols-2');
    expect(source).toContain('buildAlertSettingCreatePayload');
    expect(source).toContain("from '../ui/cold-code-editor'");
    expect(source).toContain('data-alert-setting-code-editor="threshold-expression"');
    expect(source).toContain('data-alert-setting-code-editor="alert-template"');
    expect(source).toContain('data-alert-setting-create-validation="cold-validation-feedback"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("t('alert.setting.validation.name')");
    expect(source).toContain("t('alert.setting.validation.expr')");
    expect(source).toContain("t('alert.setting.validation.template')");
    expect(source).not.toContain("setValidationMessage('规则名称为必填项')");
    expect(source).not.toContain("setValidationMessage('阈值表达式为必填项')");
    expect(source).not.toContain("setValidationMessage('告警内容为必填项')");
    expect(source).not.toContain('<textarea');
    expect(source).not.toContain('router.push');
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
    expect(html).toContain('href="/trace/manage?traceId=trace-123"');
    expect(html).toContain('返回排障上下文');
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
    expect(authoringHtml).toContain('Return to troubleshooting context');
    expect(`${typeHtml} ${authoringHtml}`).not.toMatch(/[一-龥]/);
    expect(`${typeHtml} ${authoringHtml}`).not.toContain('alert.setting.create');
  });

  it('builds the backend alert define payload with compatible defaults', () => {
    expect(buildAlertSettingCreatePayload({
      ...draft,
      kind: 'periodic',
      dataType: 'trace'
    })).toEqual({
      name: 'CPU 高负载',
      type: 'periodic_trace',
      datasource: 'promql',
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
      datasource: 'promql',
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
