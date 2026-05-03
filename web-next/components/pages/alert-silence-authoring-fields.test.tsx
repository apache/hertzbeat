import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertSilenceAuthoringFields } from './alert-silence-authoring-fields';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

describe('AlertSilenceAuthoringFields', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });

  it('renders the shared silence authoring field order with preview labels and prefill notice', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-authoring-fields.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertSilenceAuthoringFields
        t={t}
        mode="dialog"
        draft={{
          name: 'weekday',
          enable: true,
          matchAll: false,
          type: '0',
          labelsText: 'service:checkout, severity:critical',
          daysText: '',
          periodStart: '2026-04-19T08:00',
          periodEnd: '2026-04-19T18:00'
        }}
        labelOptions={{
          keys: ['alertname', 'service', 'severity'],
          valuesByKey: {
            service: ['checkout'],
            severity: ['critical']
          }
        }}
        prefillTitle="Create a silence rule for this entity"
        prefillCopy="Shared labels from the entity's visible alerts were added as the default silence condition."
        prefillWarning={null}
        previewLabels={[
          { key: 'service', value: 'checkout' },
          { key: 'severity', value: 'critical' }
        ]}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-silence-authoring-fields="dialog"');
    expect(html).toContain('data-alert-silence-authoring-layout="single-column-angular-function"');
    expect(html).toContain('Create a silence rule for this entity');
    expect(html).toContain('策略名称');
    expect(html).toContain('匹配全部');
    expect(html).toContain('静默类型');
    expect(html).toContain('静默时段');
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-control="native-hidden"');
    expect(html).toContain('data-cold-checkbox-box="indicator"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)).toHaveLength(2);
    expect(html).toContain('data-cold-segmented-control-owner="cold-segmented-control"');
    expect(html).toContain('data-alert-silence-type-control="cold-segmented-type"');
    expect(html).toContain('data-alert-silence-label-selector="searchable-label-record"');
    expect(html).toContain('data-alert-silence-row-alignment="label-time-fixed-width"');
    expect(html).toContain('data-alert-silence-aligned-control-row="label"');
    expect(html).toContain('data-alert-silence-aligned-control-row="time"');
    expect(html.match(/data-alert-silence-aligned-control-row=/g)).toHaveLength(2);
    expect(html).toContain('data-cold-label-selector-owner="cold-label-selector"');
    expect(html).toContain('data-cold-label-selector-record-row="service:checkout"');
    expect(html).toContain('data-cold-label-selector-record-row="severity:critical"');
    expect(html).toContain('data-cold-label-selector-remove-row="service:checkout"');
    expect(html).toContain('data-cold-label-selector-draft-row="true"');
    expect(html).toContain('data-cold-label-selector-key-input="searchable-key"');
    expect(html).toContain('data-cold-label-selector-value-input="searchable-value"');
    expect(html).not.toContain('data-cold-label-selector-chip=');
    expect(html).not.toContain('data-cold-label-selector-chip-list="true"');
    expect(html).not.toContain('data-cold-label-selector-suggestion=');
    expect(html).toContain('data-cold-date-time-range-owner="cold-date-time-range"');
    expect(html).toContain('data-cold-date-time-range-action-space="reserved"');
    expect(html).toContain('data-cold-date-time-range-reserved-action="true"');
    expect(html).toContain('name="silence_period_start"');
    expect(html).toContain('name="silence_period_end"');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('bg-[#101217]');
    expect(html).toContain('service:checkout');
    expect(html).toContain('severity:critical');
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain("from '../ui/date-time-range'");
    expect(source).toContain("from '../ui/label-record-input'");
    expect(source).toContain("from '../ui/segmented-control'");
    expect(source).toContain("from '../ui/weekday-picker'");
    expect(source).toContain('SILENCE_LABEL_TIME_ROW_CLASS');
    expect(source).toContain('max-w-[720px]');
    expect(source).toContain('data-alert-silence-row-alignment="label-time-fixed-width"');
    expect(source).toContain('data-alert-silence-aligned-control-row="label"');
    expect(source).toContain('data-alert-silence-aligned-control-row="time"');
    expect(source).not.toContain('name="silence_labels"\\n              value={draft.labelsText}');
    expect(source).not.toContain("from '../ui/select'");
    expect(source).not.toContain('AlertAuthoringToggleRow');
    expect(source).not.toContain('md:grid-cols-2');
    expect(source).not.toContain('accent-[var(--ops-primary)]');
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain('silence_days"');
    expect(source).not.toContain('bg-[var(--ops-surface-raised)]');
    expect(source).not.toContain('border-[var(--ops-border-color)]');
    expect(source).not.toContain('focus-visible:bg-[var(--ops-surface-panel)]');
    expect(source).not.toContain('rounded-[2px]');
  });

  it('renders cyclic silence with weekday chips and one time-range row instead of comma text', () => {
    const html = renderToStaticMarkup(
      <AlertSilenceAuthoringFields
        t={t}
        mode="dialog"
        draft={{
          name: 'weekday',
          enable: true,
          matchAll: true,
          type: '1',
          labelsText: '',
          daysText: '1,2,3,4,5',
          periodStart: '09:00',
          periodEnd: '18:00'
        }}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-cold-weekday-picker-owner="cold-weekday-picker"');
    expect(html).toContain('data-cold-time-range-owner="cold-time-range"');
    expect(html).toContain('name="silence_days[]"');
    expect(html).toContain('name="silence_period_start"');
    expect(html).toContain('name="silence_period_end"');
    expect(html).not.toContain('name="silence_days" value="1,2,3,4,5"');
    expect(html).not.toContain('data-cold-date-time-range-owner="cold-date-time-range"');
  });
});
