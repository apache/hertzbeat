import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertInhibitAuthoringFields } from './alert-inhibit-authoring-fields';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

describe('AlertInhibitAuthoringFields', () => {
  const t = createTranslatorMock();

  it('renders the shared inhibit authoring field order, previews, and shortcut posture', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-authoring-fields.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertInhibitAuthoringFields
        t={t}
        mode="dialog"
        draft={{
          name: 'db-inhibit',
          enable: true,
          sourceLabelsText: 'service:checkout, severity:critical',
          targetLabelsText: 'service:db',
          equalLabelsText: 'cluster, env'
        }}
        labelOptions={{
          keys: ['alertname', 'service', 'severity'],
          valuesByKey: {
            service: ['checkout', 'db'],
            severity: ['critical']
          }
        }}
        prefillTitle="Create an inhibit rule for this entity"
        prefillCopy="Shared labels from the entity's visible alerts were added as the default source condition."
        prefillWarning="Matching source and target labels will suppress duplicate alert noise."
        sourcePreviewLabels={[
          { key: 'service', value: 'checkout' },
          { key: 'severity', value: 'critical' }
        ]}
        targetPreviewLabels={[
          { key: 'service', value: 'db' }
        ]}
        onDraftChange={vi.fn()}
        onCopySourceToTarget={vi.fn()}
        onDropSeverity={vi.fn()}
        onClearTarget={vi.fn()}
        onClearEqual={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-inhibit-authoring-fields="dialog"');
    expect(html).toContain('data-alert-inhibit-authoring-layout="single-column"');
    expect(html).toContain('data-alert-inhibit-authoring-form="single-column"');
    expect(html).toContain('Create an inhibit rule for this entity');
    expect(html).toContain('Matching source and target labels will suppress duplicate alert noise.');
    expect(html).toContain(t('entity.alert.workbench.inhibit.shortcut.copy-source'));
    expect(html).toContain(t('entity.alert.workbench.inhibit.shortcut.drop-severity'));
    expect(html).toContain(t('entity.alert.workbench.inhibit.shortcut.clear-target'));
    expect(html).toContain(t('entity.alert.workbench.inhibit.shortcut.clear-equal'));
    expect(html).toContain(t('alert.inhibit.name'));
    expect(html).toContain(t('alert.inhibit.source_labels'));
    expect(html).toContain(t('alert.inhibit.target_labels'));
    expect(html).toContain(t('alert.inhibit.equal_labels'));
    expect(html.match(/data-alert-inhibit-authoring-field-help=/g)).toHaveLength(5);
    expect(html.match(/data-alert-authoring-field-help-placement="inline-label"/g)).toHaveLength(5);
    expect(html.match(/data-alert-authoring-field-help-trigger="hertzbeat-ui-field-help"/g)).toHaveLength(5);
    expect(html.match(/data-alert-authoring-field-help-visual="circle-help-icon"/g)).toHaveLength(5);
    expect(html.match(/data-alert-authoring-field-help-icon="lucide-circle-help"/g)).toHaveLength(5);
    expect(html).not.toContain('data-alert-authoring-field-help-visual="borderless-question"');
    expect(html).toContain('data-alert-inhibit-authoring-field-help="name"');
    expect(html).toContain('data-alert-inhibit-authoring-field-help="enable"');
    expect(html).toContain('data-alert-inhibit-authoring-field-help="source-labels"');
    expect(html).toContain('data-alert-inhibit-authoring-field-help="target-labels"');
    expect(html).toContain('data-alert-inhibit-authoring-field-help="equal-labels"');
    expect(html).toContain(t('alert.inhibit.field.source-labels.help'));
    expect(html).toContain(t('alert.inhibit.field.target-labels.impact'));
    expect(html).toContain(t('alert.inhibit.field.equal-labels.help'));
    expect(html.match(/data-alert-inhibit-authoring-field-requirement="required"/g)).toHaveLength(5);
    expect(html).not.toContain('data-alert-inhibit-authoring-field-requirement="optional"');
    expect(html.match(/data-alert-inhibit-authoring-field-input-mode=/g)).toHaveLength(5);
    expect(html.match(/data-alert-inhibit-authoring-field-input-mode="manual"/g)).toHaveLength(1);
    expect(html.match(/data-alert-inhibit-authoring-field-input-mode="selection"/g)).toHaveLength(1);
    expect(html.match(/data-alert-inhibit-authoring-field-input-mode="manual-or-selection"/g)).toHaveLength(3);
    expect(html).toContain(t('alert.inhibit.field.requirement.required'));
    expect(html).toContain(t('alert.inhibit.field.input-mode.manual'));
    expect(html).toContain(t('alert.inhibit.field.input-mode.selection'));
    expect(html).toContain(t('alert.inhibit.field.input-mode.manual-or-selection'));
    expect(html.split('text-[var(--ops-critical)]').length - 1).toBe(5);
    expect(html).toContain('data-alert-inhibit-source-label-selector="searchable-label-record"');
    expect(html).toContain('data-alert-inhibit-target-label-selector="searchable-label-record"');
    expect(html).toContain('data-alert-inhibit-equal-label-selector="searchable-tags"');
    expect(html.match(/data-hz-label-selector-owner="hertzbeat-ui-label-selector"/g)).toHaveLength(2);
    expect(html).toContain('data-hz-tag-input-owner="hertzbeat-ui-tag-input"');
    expect(html).toContain('data-hz-tag-input-mode="searchable-tags"');
    expect(html).toContain('data-hz-label-selector-record-row="service:checkout"');
    expect(html).toContain('data-hz-label-selector-record-row="severity:critical"');
    expect(html).toContain('data-hz-label-selector-record-row="service:db"');
    expect(html).toContain('data-hz-label-selector-remove-row="service:checkout"');
    expect(html).toContain('data-hz-label-selector-remove-row="service:db"');
    expect(html.match(/data-hz-label-selector-draft-row="true"/g)).toHaveLength(2);
    expect(html).toContain('data-hz-label-selector-key-input="searchable-key"');
    expect(html).toContain('data-hz-label-selector-value-input="searchable-value"');
    expect(html).not.toContain('data-hz-label-selector-chip=');
    expect(html).not.toContain('data-hz-label-selector-chip-list="true"');
    expect(html).not.toContain('data-hz-label-selector-suggestion=');
    expect(html).not.toContain('data-hz-tag-suggestion=');
    expect(html).toContain('data-alert-inhibit-enable-row="inline-control"');
    expect(html).toContain('data-hz-checkbox-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-hz-checkbox-control="native-hidden"');
    expect(html).toContain('data-hz-checkbox-box="indicator"');
    expect(html).toContain('service:checkout');
    expect(html).toContain('severity:critical');
    expect(html).toContain('service:db');
    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain("from '../ui/label-record-input'");
    expect(source).toContain("from '../ui/tag-input'");
    expect(source).not.toContain('AlertAuthoringToggleRow');
    expect(source).not.toContain('md:grid-cols-2');
    expect(source).not.toContain('md:col-span-2');
    expect(source).not.toContain('rounded-[6px]');
    expect(source).not.toContain('accent-[var(--ops-primary)]');
    expect(source).not.toContain('type="checkbox"');
    expect(source).not.toContain('name="inhibit_source_labels"\\n            value={draft.sourceLabelsText}');
    expect(source).not.toContain('name="inhibit_target_labels"\\n            value={draft.targetLabelsText}');
  });
});
