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
    expect(html).toContain('data-alert-silence-validation-contract="angular-name-labels-only"');
    expect(html).toContain('Create a silence rule for this entity');
    expect(html).toContain(t('alert.silence.name'));
    expect(html).toContain(t('alert.silence.match-all'));
    expect(html).toContain(t('alert.silence.type'));
    expect(html).toContain(t('alert.silence.time'));
    expect(html.match(/data-alert-silence-authoring-field-help=/g)).toHaveLength(6);
    expect(html.match(/data-alert-authoring-field-help-placement="inline-label"/g)).toHaveLength(6);
    expect(html.match(/data-alert-authoring-field-help-trigger="hertzbeat-ui-field-help"/g)).toHaveLength(6);
    expect(html.match(/data-alert-authoring-field-help-visual="circle-help-icon"/g)).toHaveLength(6);
    expect(html.match(/data-alert-authoring-field-help-icon="lucide-circle-help"/g)).toHaveLength(6);
    expect(html).not.toContain('data-alert-authoring-field-help-visual="borderless-question"');
    expect(html).toContain('data-alert-silence-authoring-field-help="name"');
    expect(html).toContain('data-alert-silence-authoring-field-help="enable"');
    expect(html).toContain('data-alert-silence-authoring-field-help="match-all"');
    expect(html).toContain('data-alert-silence-authoring-field-help="type"');
    expect(html).toContain('data-alert-silence-authoring-field-help="labels"');
    expect(html).toContain('data-alert-silence-authoring-field-help="time"');
    expect(html).toContain(t('alert.silence.field.match-all.impact'));
    expect(html).toContain(t('alert.silence.field.type.help'));
    expect(html).toContain(t('alert.silence.field.time.impact'));
    expect(html.match(/data-alert-silence-authoring-field-requirement=/g)).toHaveLength(6);
    expect(html.match(/data-alert-silence-authoring-field-requirement="required"/g)).toHaveLength(4);
    expect(html.match(/data-alert-silence-authoring-field-requirement="conditional"/g)).toHaveLength(1);
    expect(html.match(/data-alert-silence-authoring-field-requirement="optional"/g)).toHaveLength(1);
    expect(html.match(/data-alert-silence-authoring-field-input-mode=/g)).toHaveLength(6);
    expect(html.match(/data-alert-silence-authoring-field-input-mode="manual"/g)).toHaveLength(1);
    expect(html.match(/data-alert-silence-authoring-field-input-mode="selection"/g)).toHaveLength(3);
    expect(html.match(/data-alert-silence-authoring-field-input-mode="manual-or-selection"/g)).toHaveLength(1);
    expect(html.match(/data-alert-silence-authoring-field-input-mode="time-range"/g)).toHaveLength(1);
    expect(html).toContain(t('alert.silence.field.requirement.required'));
    expect(html).toContain(t('alert.silence.field.requirement.conditional'));
    expect(html).toContain(t('alert.silence.field.requirement.optional'));
    expect(html).toContain(t('alert.silence.field.input-mode.manual'));
    expect(html).toContain(t('alert.silence.field.input-mode.selection'));
    expect(html).toContain(t('alert.silence.field.input-mode.manual-or-selection'));
    expect(html).toContain(t('alert.silence.field.input-mode.time-range'));
    expect(html.split('text-[var(--ops-critical)]').length - 1).toBe(5);
    expect(html).toContain('data-hz-checkbox-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-hz-checkbox-control="native-hidden"');
    expect(html).toContain('data-hz-checkbox-box="indicator"');
    expect(html.match(/data-hz-checkbox-owner="hertzbeat-ui-checkbox"/g)).toHaveLength(2);
    expect(html).toContain('data-hz-segmented-control-owner="hertzbeat-ui-segmented-control"');
    expect(html).toContain('data-alert-silence-type-control="hertzbeat-ui-segmented-type"');
    expect(html).toContain('data-alert-silence-label-selector="searchable-label-record"');
    expect(html).toContain('data-alert-silence-row-alignment="label-time-fixed-width"');
    expect(html).toContain('data-alert-silence-aligned-control-row="label"');
    expect(html).toContain('data-alert-silence-aligned-control-row="time"');
    expect(html.match(/data-alert-silence-aligned-control-row=/g)).toHaveLength(2);
    expect(html).toContain('data-hz-label-selector-owner="hertzbeat-ui-label-selector"');
    expect(html).toContain('data-hz-label-selector-record-row="service:checkout"');
    expect(html).toContain('data-hz-label-selector-record-row="severity:critical"');
    expect(html).toContain('data-hz-label-selector-remove-row="service:checkout"');
    expect(html).toContain('data-hz-label-selector-draft-row="true"');
    expect(html).toContain('data-hz-label-selector-key-input="searchable-key"');
    expect(html).toContain('data-hz-label-selector-value-input="searchable-value"');
    expect(html).not.toContain('data-hz-label-selector-chip=');
    expect(html).not.toContain('data-hz-label-selector-chip-list="true"');
    expect(html).not.toContain('data-hz-label-selector-suggestion=');
    expect(html).toContain('data-hz-date-time-range-owner="hertzbeat-ui-date-time-range"');
    expect(html).toContain('data-hz-date-time-range-action-space="reserved"');
    expect(html).toContain('data-hz-date-time-range-reserved-action="true"');
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
    expect(source).toContain("aria-label={t('common.enable')}");
    expect(source).toContain("aria-label={t('alert.silence.match-all')}");
    expect(source).not.toContain('name="silence_enable"\n            checked={draft.enable}\n            label=');
    expect(source).not.toContain('name="silence_match_all"\n            checked={draft.matchAll}\n            label=');
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

    expect(html).toContain('data-hz-weekday-picker-owner="hertzbeat-ui-weekday-picker"');
    expect(html).toContain('data-alert-silence-authoring-field-help="days"');
    expect(html).toContain(t('alert.silence.field.days.help'));
    expect(html).toContain(t('alert.silence.field.time.help'));
    expect(html.match(/data-alert-silence-authoring-field-requirement=/g)).toHaveLength(6);
    expect(html.match(/data-alert-silence-authoring-field-requirement="required"/g)).toHaveLength(5);
    expect(html.match(/data-alert-silence-authoring-field-requirement="optional"/g)).toHaveLength(1);
    expect(html).not.toContain('data-alert-silence-authoring-field-requirement="conditional"');
    expect(html.match(/data-alert-silence-authoring-field-input-mode=/g)).toHaveLength(6);
    expect(html.match(/data-alert-silence-authoring-field-input-mode="manual"/g)).toHaveLength(1);
    expect(html.match(/data-alert-silence-authoring-field-input-mode="selection"/g)).toHaveLength(4);
    expect(html.match(/data-alert-silence-authoring-field-input-mode="time-range"/g)).toHaveLength(1);
    expect(html).not.toContain('data-alert-silence-authoring-field-input-mode="manual-or-selection"');
    expect(html.split('text-[var(--ops-critical)]').length - 1).toBe(5);
    expect(html).toContain('data-hz-time-range-owner="hertzbeat-ui-time-range"');
    expect(html).toContain('name="silence_days[]"');
    expect(html).toContain('name="silence_period_start"');
    expect(html).toContain('name="silence_period_end"');
    expect(html).not.toContain('name="silence_days" value="1,2,3,4,5"');
    expect(html).not.toContain('data-hz-date-time-range-owner="hertzbeat-ui-date-time-range"');
  });
});
