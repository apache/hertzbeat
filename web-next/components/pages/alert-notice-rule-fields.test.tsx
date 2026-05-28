import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertNoticeRuleFields } from './alert-notice-rule-fields';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('../ui/select', () => ({
  Select: ({ children, containerClassName: _containerClassName, ...props }: any) => <select {...props}>{children}</select>
}));

describe('AlertNoticeRuleFields', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });

  it('renders the current notice rule field order and scheduling posture', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeRuleFields
        t={t}
        draft={{
          name: 'PagerDuty critical',
          receiverIdsText: '1, 2',
          templateId: '9',
          enable: true,
          filterAll: false,
          labelsText: 'severity:critical',
          daysText: '1,2,3,4,5',
          periodStart: '09:00',
          periodEnd: '18:00'
        }}
        receiverOptions={[
          { value: '1', label: '平台值班-邮箱' },
          { value: '2', label: '支付值班-Webhook' }
        ]}
        templateOptions={[
          { value: '-1', label: '系统内置模版' },
          { value: '9', label: '邮件告警模板' }
        ]}
        labelOptions={{
          keys: ['severity', 'service'],
          valuesByKey: { severity: ['critical', 'warning'], service: ['checkout'] }
        }}
        receiverIdsPlaceholder="接收对象 ID，例如 1, 2"
        templateIdPlaceholder="模板 ID，-1 表示默认模板"
        labelsPlaceholder="标签匹配，例如 severity:critical"
        daysPlaceholder="日期范围，例如 1,2,3,4,5"
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-rule-fields="true"');
    expect(html).toContain('data-alert-notice-rule-layout="angular-aligned-modal-form"');
    expect(html).toContain('data-alert-notice-rule-form="aligned-label-control"');
    expect(html).toContain('data-alert-notice-rule-period-default-days="angular-all-days"');
    expect(html).toContain('data-alert-notice-rule-period-default-days-owner="route-form-contract"');
    expect(html).toContain('data-alert-notice-rule-period-limit-state="angular-independent-isLimit"');
    expect(html).toContain('data-alert-notice-rule-period-limit-state-owner="route-form-contract"');
    expect(html).toContain('data-alert-notice-rule-edit-option-seeding="angular-detail-options"');
    expect(html).toContain('data-alert-notice-rule-edit-option-seeding-owner="route-form-contract"');
    expect(html).toContain('data-alert-notice-rule-receiver-selector="cold-multi-select"');
    expect(html).toContain('data-alert-notice-rule-template-selector="cold-select"');
    expect(html).toContain('data-alert-notice-rule-days-selector="cold-weekday-checkboxes"');
    expect(html).toContain('策略名称');
    expect(html).not.toContain('alert.notice.rule.name');
    expect(html).toContain('data-testid="notice-rule-field-name"');
    expect(html).toContain('data-testid="notice-rule-field-receiverIdsText"');
    expect(html).toContain('data-testid="notice-rule-field-templateId"');
    expect(html).toContain('data-testid="notice-rule-field-enable"');
    expect(html).toContain('data-testid="notice-rule-field-filterAll"');
    expect(html).toContain('data-alert-notice-rule-switch="filter-all"');
    expect(html).toContain('data-alert-notice-rule-switch="period-limit"');
    expect(html).toContain('data-alert-notice-rule-switch="enable"');
    expect(html).toContain('data-alert-notice-rule-single-switch-frame="none"');
    expect(html).toContain('data-alert-notice-rule-single-switch-frame-owner="route-form-contract"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('平台值班-邮箱');
    expect(html).toContain('支付值班-Webhook');
    expect(html).toContain('邮件告警模板');
    expect(html).toContain('接收对象');
    expect(html).toContain('通知模板');
    expect(html).toContain('标签匹配');
    expect(html).toContain('启用状态');
    expect(html).not.toContain('alert.notice.receiver.people');
    expect(html).not.toContain('common.enable');
    expect(html).not.toContain('alert.notice.rule.receiver');
    expect(html).not.toContain('alert.notice.rule.template');
    expect(html).not.toContain('alert.notice.rule.label');
    expect(html).toContain('data-alert-notice-rule-label-selector="searchable-label-record"');
    expect(html).toContain('data-cold-label-selector-owner="cold-label-selector"');
    expect(html).toContain('data-cold-label-selector-record-row="severity:critical"');
    expect(html).toContain('data-cold-label-selector-remove-row="severity:critical"');
    expect(html).toContain('data-cold-label-selector-draft-row="true"');
    expect(html).toContain('data-cold-label-selector-key-input="searchable-key"');
    expect(html).toContain('data-cold-label-selector-value-input="searchable-value"');
    expect(html).toContain('data-testid="notice-rule-field-daysText"');
    expect(html).toContain('name="periodStart"');
    expect(html).toContain('name="periodEnd"');
    expect(html).toContain('data-cold-time-range-owner="cold-time-range"');
    expect(html).toContain('data-cold-date-time-picker-owner="cold-date-time-picker"');
    expect(html).toContain('data-cold-date-time-picker-library="react-datepicker"');
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)?.length).toBeGreaterThanOrEqual(9);
    expect(html).toContain('data-cold-checkbox-box="indicator"');
    expect(html).not.toContain('type="time"');
    expect(html).not.toContain('accent-[var(--ops-primary)]');
  });

  it('keeps Angular all-weekday defaults when turning notice rule custom period on', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');
    expect(source).toContain('data-alert-notice-rule-period-default-days="angular-all-days"');
    expect(source).toContain('data-alert-notice-rule-period-limit-state="angular-independent-isLimit"');
    expect(source).toContain('const customPeriod = draft.periodLimit ?? !isAllDaysSelected');
    expect(source).toContain('periodLimit: checked');
    expect(source).toContain('daysText: checked ? prev.daysText || weekdayValues.join');
    expect(source).not.toContain("daysText: checked ? '1, 2, 3, 4, 5'");
  });

  it('shows the weekday selector when Angular isLimit is true even if all weekdays are selected', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeRuleFields
        t={t}
        draft={{
          name: 'All weekday custom period',
          receiverIdsText: '1',
          templateId: '-1',
          enable: true,
          filterAll: true,
          labelsText: '',
          daysText: '1, 2, 3, 4, 5, 6, 7',
          periodLimit: true,
          periodStart: '',
          periodEnd: ''
        }}
        receiverIdsPlaceholder="接收对象 ID，例如 1, 2"
        templateIdPlaceholder="模板 ID，-1 表示默认模板"
        labelsPlaceholder="标签匹配，例如 severity:critical"
        daysPlaceholder="日期范围，例如 1,2,3,4,5"
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-rule-days-selector="cold-weekday-checkboxes"');
    expect(html).toContain('aria-checked="true"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)?.length).toBeGreaterThanOrEqual(7);
  });

  it('seeds edit receiver and template options from notice rule detail before option pages load', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeRuleFields
        t={t}
        draft={{
          name: 'Detail seeded rule',
          receiverIdsText: '42',
          receiverName: ['Detail receiver'],
          templateId: '99',
          templateName: 'Detail template',
          enable: true,
          filterAll: true,
          labelsText: '',
          daysText: '1, 2, 3, 4, 5, 6, 7',
          periodStart: '',
          periodEnd: ''
        }}
        receiverOptions={[]}
        templateOptions={[{ value: '-1', label: '系统内置模版' }]}
        receiverIdsPlaceholder="接收对象 ID，例如 1, 2"
        templateIdPlaceholder="模板 ID，-1 表示默认模板"
        labelsPlaceholder="标签匹配，例如 severity:critical"
        daysPlaceholder="日期范围，例如 1,2,3,4,5"
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-rule-edit-option-seeding="angular-detail-options"');
    expect(html).toContain('data-alert-notice-rule-edit-option-seeding-owner="route-form-contract"');
    expect(html).toContain('Detail receiver');
    expect(html).toContain('Detail template');
    expect(html).not.toContain('暂无接收对象');

    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');
    expect(source).toContain('function mergeDetailReceiverOptions');
    expect(source).toContain('function buildDetailTemplateOption');
    expect(source).toContain('draft.receiverName');
    expect(source).toContain('draft.templateName');
  });

  it('keeps new notice rule time defaults empty like Angular NoticeRule', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');
    expect(source).toContain('data-alert-notice-rule-time-default="angular-empty-new-rule"');
    expect(source).toContain('data-alert-notice-rule-time-default-owner="route-form-contract"');
    expect(source).toContain('data-alert-notice-rule-optional-period-time="angular-form-validity"');
    expect(source).toContain('data-alert-notice-rule-optional-period-time-owner="route-validation-contract"');
  });

  it('filters notification templates by the selected receiver type and resets template selection when receivers change', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeRuleFields
        t={t}
        draft={{
          name: 'Email route',
          receiverIdsText: '1',
          templateId: '9',
          enable: true,
          filterAll: true,
          labelsText: '',
          daysText: '1,2,3,4,5,6,7',
          periodStart: '09:00',
          periodEnd: '18:00'
        }}
        receiverOptions={[
          { value: '1', label: '平台值班-邮箱', type: '1' },
          { value: '2', label: 'Webhook 值班-WebHook', type: '2' }
        ]}
        templateOptions={[
          { value: '-1', label: '系统内置模版' },
          { value: '9', label: '邮件告警模板', type: '1' },
          { value: '10', label: 'Webhook 告警模板', type: '2' }
        ]}
        receiverIdsPlaceholder="接收对象 ID，例如 1, 2"
        templateIdPlaceholder="模板 ID，-1 表示默认模板"
        labelsPlaceholder="标签匹配，例如 severity:critical"
        daysPlaceholder="日期范围，例如 1,2,3,4,5"
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('系统内置模版');
    expect(html).toContain('邮件告警模板');
    expect(html).not.toContain('Webhook 告警模板');

    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');
    expect(source).toContain('filterTemplateOptionsForReceivers');
    expect(source).toContain("templateId: '-1'");
  });

  it('keeps notice rule template options scoped to the selected Angular receiver type', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeRuleFields
        t={t}
        draft={{
          name: 'Phone route',
          receiverIdsText: '1',
          templateId: '-1',
          enable: true,
          filterAll: true,
          labelsText: '',
          daysText: '1,2,3,4,5,6,7',
          periodStart: '',
          periodEnd: ''
        }}
        receiverOptions={[
          { value: '1', label: '平台值班-Phone', type: 0 }
        ]}
        templateOptions={[
          { value: '-1', label: '系统内置模版' },
          { value: '8', label: '电话告警模板', type: 0 },
          { value: '9', label: '邮件告警模板', type: 1 },
          { value: '10', label: '缺少类型模板' }
        ]}
        receiverIdsPlaceholder="接收对象 ID，例如 1, 2"
        templateIdPlaceholder="模板 ID，-1 表示默认模板"
        labelsPlaceholder="标签匹配，例如 severity:critical"
        daysPlaceholder="日期范围，例如 1,2,3,4,5"
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-rule-template-type-filter="angular-selected-receiver-type"');
    expect(html).toContain('data-alert-notice-rule-template-type-filter-owner="route-form-contract"');
    expect(html).toContain('电话告警模板');
    expect(html).not.toContain('邮件告警模板');
    expect(html).not.toContain('缺少类型模板');

    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');
    expect(source).toContain('if (value == null)');
    expect(source).not.toContain('|| !optionType || selectedReceiverTypes.has(optionType)');
  });

  it('uses the Angular switchReceiver active type when multiple receivers are selected', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeRuleFields
        t={t}
        draft={{
          name: 'Mixed route',
          receiverIdsText: '1,2',
          templateId: '-1',
          enable: true,
          filterAll: true,
          labelsText: '',
          daysText: '1,2,3,4,5,6,7',
          periodStart: '',
          periodEnd: ''
        }}
        receiverOptions={[
          { value: '1', label: '平台值班-Email', type: 1 },
          { value: '2', label: 'Webhook 值班-WebHook', type: 2 }
        ]}
        templateOptions={[
          { value: '-1', label: '系统内置模版' },
          { value: '9', label: '邮件告警模板', type: 1 },
          { value: '10', label: 'Webhook 告警模板', type: 2 }
        ]}
        receiverIdsPlaceholder="接收对象 ID，例如 1, 2"
        templateIdPlaceholder="模板 ID，-1 表示默认模板"
        labelsPlaceholder="标签匹配，例如 severity:critical"
        daysPlaceholder="日期范围，例如 1,2,3,4,5"
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-rule-template-active-type="angular-switch-receiver"');
    expect(html).toContain('data-alert-notice-rule-template-active-type-owner="route-form-contract"');
    expect(html).toContain('Webhook 告警模板');
    expect(html).not.toContain('邮件告警模板');

    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');
    expect(source).toContain('let activeReceiverType: string | null = null;');
    expect(source).toContain('receiverOptions.forEach(option => {');
    expect(source).toContain('optionType === activeReceiverType');
    expect(source).not.toContain('const selectedReceiverTypes = new Set');
  });

  it('keeps the empty receiver selector prompt localized without changing the cold selector shell', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeRuleFields
        t={createTranslatorMock({
          locale: 'zh-CN',
          overrides: {
            'alert.notice.rule.receivers.empty': '暂无接收对象，请先新增接收对象'
          }
        })}
        draft={{
          name: 'Email route',
          receiverIdsText: '',
          templateId: '-1',
          enable: true,
          filterAll: true,
          labelsText: '',
          daysText: '1,2,3,4,5,6,7',
          periodStart: '09:00',
          periodEnd: '18:00'
        }}
        receiverOptions={[]}
        templateOptions={[]}
        receiverIdsPlaceholder="接收对象 ID，例如 1, 2"
        templateIdPlaceholder="模板 ID，-1 表示默认模板"
        labelsPlaceholder="标签匹配，例如 severity:critical"
        daysPlaceholder="日期范围，例如 1,2,3,4,5"
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-rule-receiver-selector="cold-multi-select"');
    expect(html).toContain('data-testid="notice-rule-field-receiverIdsText"');
    expect(html).toContain('暂无接收对象，请先新增接收对象');

    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');
    expect(source).toContain("t('alert.notice.rule.receivers.empty')");
    expect(source).not.toContain('暂无接收对象，请先新增接收对象');
  });

  it('does not keep page-local native checkbox, raw id inputs, or time chrome in the notice rule authoring fields', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');

    expect(source).toContain("t('alert.notice.receiver.people')");
    expect(source).toContain("t('common.enable')");
    expect(source).not.toContain('接收对象');
    expect(source).not.toContain('启用状态');
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain("from '../ui/date-time-range'");
    expect(source).toContain("from '../ui/label-record-input'");
    expect(source).toContain("from '../ui/select'");
    expect(source).toContain('receiverOptions');
    expect(source).toContain('templateOptions');
    expect(source).toContain('type?: string | number | null');
    expect(source).toContain('data-alert-notice-rule-label-selector="searchable-label-record"');
    expect(source).toContain('data-alert-notice-rule-receiver-selector="cold-multi-select"');
    expect(source).toContain('data-alert-notice-rule-template-selector="cold-select"');
    expect(source).toContain('data-alert-notice-rule-template-type-filter="angular-selected-receiver-type"');
    expect(source).toContain('data-alert-notice-rule-template-active-type="angular-switch-receiver"');
    expect(source).toContain('data-alert-notice-rule-days-selector="cold-weekday-checkboxes"');
    expect(source).toContain('export function AlertNoticeRuleSwitch');
    expect(source).toContain('data-alert-notice-rule-switch={row}');
    expect(source).toContain('data-alert-notice-rule-single-switch-frame="none"');
    expect(source).toContain('data-alert-notice-rule-period-default-days="angular-all-days"');
    expect(source).toContain('data-alert-notice-rule-time-default="angular-empty-new-rule"');
    expect(source).toContain('aria-label={label}');
    expect(source).toContain('hover:border-[#5f7df6]');
    expect(source).toContain('data-alert-notice-rule-switch-label={row}');
    expect(source).toContain('role="switch"');
    expect(source).not.toContain('hover:text-white');
    expect(source).not.toContain('inline-flex h-8 items-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2');
    expect(source).not.toContain('md:grid-cols-2');
    expect(source).not.toContain('md:col-span-2');
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain('type="time"');
    expect(source).not.toContain('accent-[var(--ops-primary)]');
    expect(source).not.toContain('placeholder={receiverIdsPlaceholder}');
    expect(source).not.toContain('placeholder={templateIdPlaceholder}');
    expect(source).not.toContain('data-testid="notice-rule-field-labelsText"');
  });
});
