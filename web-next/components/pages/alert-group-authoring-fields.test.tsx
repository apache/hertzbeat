import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertGroupAuthoringFields } from './alert-group-authoring-fields';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

describe('AlertGroupAuthoringFields', () => {
  const t = createTranslatorMock();

  it('renders the shared group authoring field order and label-key selector', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-group-authoring-fields.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertGroupAuthoringFields
        t={t}
        mode="dialog"
        draft={{
          name: 'ops-group',
          enable: true,
          groupLabelsText: 'alertname, service',
          groupWait: '30',
          groupInterval: '300',
          repeatInterval: '14400'
        }}
        labelOptions={{
          keys: ['alertname', 'instance', 'job'],
          valuesByKey: {
            severity: ['critical', 'warning']
          }
        }}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-group-authoring-fields="dialog"');
    expect(html).toContain('data-alert-group-authoring-layout="single-column"');
    expect(html).toContain('data-alert-group-authoring-form="single-column"');
    expect(html).toContain('data-alert-group-enable-row="inline-control"');
    expect(html).toContain(t('alert.group-converge.name'));
    expect(html).toContain(t('alert.group-converge.group-labels'));
    expect(html).toContain(t('alert.group-converge.group-wait'));
    expect(html).toContain(t('alert.group-converge.group-interval'));
    expect(html).toContain(t('alert.group-converge.repeat-interval'));
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-box="indicator"');
    expect(html).toContain('data-cold-tag-input-owner="cold-tag-input"');
    expect(html).toContain('data-cold-tag-input-mode="searchable-tags"');
    expect(html).toContain('data-cold-tag-chip="alertname"');
    expect(html).toContain('data-cold-tag-remove="service"');
    expect(html).toContain('data-alert-group-label-selector="shared-label-key-tags"');
    expect(html).toContain('data-alert-group-label-mode="group-by-label-keys"');
    expect(html).not.toContain('data-cold-tag-suggestion=');
    expect(html).not.toContain('data-cold-label-selector-owner="cold-label-selector"');
    expect(html).not.toContain('data-cold-label-selector-key-input="searchable-key"');
    expect(html).toContain('data-cold-number-stepper-owner="cold-number-stepper"');
    expect(html).toContain('data-cold-number-stepper-action="increment"');
    expect(html).toContain('data-cold-number-stepper-action="decrement"');
    expect(html).toContain('alertname');
    expect(html).not.toContain('instance');
    expect(html).not.toContain('job');
    expect(html).not.toContain('accent-[var(--ops-primary)]');
    expect(html).not.toContain('type="number"');
    expect(source).toContain('data-alert-group-authoring-layout="single-column"');
    expect(source).toContain('data-alert-group-authoring-form="single-column"');
    expect(source).toContain('data-alert-group-enable-row="inline-control"');
    expect(source).toContain('type AlertLabelOptions');
    expect(source).toContain('DEFAULT_ALERT_LABEL_OPTIONS');
    expect(source).toContain('suggestions={effectiveLabelOptions.keys}');
    expect(source).not.toContain('suggestedLabels');
    expect(source).not.toContain('LabelRecordInput');
    expect(source).not.toContain('AlertAuthoringPanel');
    expect(source).not.toContain('md:grid-cols-2');
    expect(source).not.toContain('md:col-span-2');
    expect(source).not.toContain('AlertAuthoringToggleRow');
  });
});
