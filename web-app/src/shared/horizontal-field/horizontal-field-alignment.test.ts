/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import alertGroupEditor from '@/features/alert/components/alert-group-editor.tsx?raw';
import alertInhibitEditor from '@/features/alert/components/alert-inhibit-editor.tsx?raw';
import alertRuleFieldLabel from '@/features/alert/components/alert-rule-field-label.tsx?raw';
import alertRuleFields from '@/features/alert/components/alert-rule-fields.tsx?raw';
import alertRuleLogConditionEditor from '@/features/alert/components/alert-rule-log-condition-editor.tsx?raw';
import alertRuleMetricConditionEditor from '@/features/alert/components/alert-rule-metric-condition-editor.tsx?raw';
import alertSilenceFieldRow from '@/features/alert/components/alert-silence-field-row.tsx?raw';
import noticeReceiverEditor from '@/features/alert/notice-receiver/components/notice-receiver-editor.tsx?raw';
import noticeReceiverFields from '@/features/alert/notice-receiver/components/notice-receiver-fields.tsx?raw';
import alertGroupStyles from '@/features/alert/shared/alert-group-editor.module.css?raw';
import alertInhibitStyles from '@/features/alert/shared/alert-inhibit-editor.module.css?raw';
import alertRuleStyles from '@/features/alert/shared/alert-rule-editor.module.css?raw';
import alertSilenceStyles from '@/features/alert/shared/alert-silence-editor.module.css?raw';
import noticeReceiverStyles from '@/features/alert/notice-receiver/components/notice-receiver-editor.module.css?raw';

import alignmentStyles from './horizontal-field-alignment.module.css?raw';

const affectedComponents = [
  alertGroupEditor,
  alertInhibitEditor,
  alertSilenceFieldRow,
  noticeReceiverEditor,
  noticeReceiverFields
];

const affectedStylesheets = [
  alertGroupStyles,
  alertInhibitStyles,
  alertRuleStyles,
  alertSilenceStyles,
  noticeReceiverStyles
];

describe('horizontal field alignment contract', () => {
  it('aligns labels and controls to the shared control-height rail', () => {
    expect(alignmentStyles).toMatch(
      /\.label\s*\{[^}]*min-height:\s*var\(--ant-control-height\);[^}]*align-items:\s*center;[^}]*padding-top:\s*0;/s
    );
    expect(alignmentStyles).toMatch(/\.control\s*\{[^}]*min-height:\s*var\(--ant-control-height\);/s);
    expect(alignmentStyles).toMatch(/\.compactControl\s*\{[^}]*align-content:\s*center;/s);
    expect(alignmentStyles).toMatch(
      /\.control\s*>\s*:global\(\.ant-switch\)\s*\{[^}]*align-self:\s*center;[^}]*justify-self:\s*start;/s
    );
  });

  it('resets the fixed label rail when the field rows stack on narrow screens', () => {
    expect(alignmentStyles).toMatch(/@media\s*\(max-width:\s*800px\)[\s\S]*?\.label\s*\{[^}]*min-height:\s*0;/s);
  });

  it('applies the shared contract to every custom horizontal alert form', () => {
    affectedComponents.forEach(source => {
      expect(source).toContain('horizontal-field-alignment.module.css');
      expect(source).toMatch(/className=\{`\$\{styles\.fieldLabel\}\s+\$\{alignmentStyles\.label\}`\}/);
      expect(source).toMatch(/className=\{`\$\{styles\.fieldControl\}\s+\$\{alignmentStyles\.control\}`\}/);
    });

    expect(alertRuleFieldLabel).toContain('horizontal-field-alignment.module.css');
    expect(alertRuleFieldLabel).toMatch(
      /className=\{`\$\{className\s*\?\?\s*''\}\s+\$\{alignmentStyles\.label\}`\.trim\(\)\}/
    );
    expect(alertRuleFields).toContain('horizontal-field-alignment.module.css');
    expect(alertRuleFields).toMatch(/className=\{`\$\{styles\.fieldControl\}\s+\$\{alignmentStyles\.control\}`\}/);
    [alertRuleLogConditionEditor, alertRuleMetricConditionEditor].forEach(source => {
      expect(source).toContain('horizontal-field-alignment.module.css');
      expect(source).toMatch(
        /className=\{`\$\{styles\.conditionModeControl\}\s+\$\{alignmentStyles\.control\}\s+\$\{alignmentStyles\.compactControl\}`\}/
      );
    });
  });

  it('does not retain per-screen vertical nudges or padding guesses', () => {
    affectedStylesheets.forEach(source => {
      expect(source).not.toMatch(/\.fieldLabel\s*\{[^}]*padding-top:\s*6px;/s);
      expect(source).not.toMatch(/\.fieldLabel\s*\{[^}]*padding:\s*6px\s+/s);
      expect(source).not.toMatch(/\.fieldLabel\s*\{[^}]*transform:/s);
    });
    expect(alertRuleStyles).not.toMatch(/\.metricLabel\s*\{[^}]*padding-top:/s);
    expect(alertRuleStyles).not.toMatch(/\.conditionModeLabel\s*\{[^}]*padding-top:/s);
  });
});
