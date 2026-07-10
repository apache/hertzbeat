import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('alert notice and quick-dialog cold-workbench chrome', () => {
  it('removes the remaining legacy alert notice field and quick-dialog chrome from the current Milestone 4 slice', () => {
    const ruleSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');
    const receiverSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-receiver-fields.tsx'), 'utf8');
    const quickDialogSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-rule-quick-dialog.tsx'), 'utf8');
    const combinedSource = [ruleSource, receiverSource, quickDialogSource].join('\n');

    expect(combinedSource).not.toContain('text-[#d2cbc0]');
    expect(combinedSource).not.toContain('text-white/80');
    expect(combinedSource).not.toContain('text-rose-300');
    expect(combinedSource).not.toContain('rounded-[14px]');
    expect(combinedSource).not.toContain('rounded-[16px]');
    expect(combinedSource).not.toContain('border-white/8');
    expect(combinedSource).not.toContain('border-white/10');
    expect(combinedSource).not.toContain('bg-white/[0.025]');
    expect(combinedSource).not.toContain('bg-white/[0.03]');
    expect(combinedSource).not.toContain('text-[#8f887d]');
    expect(combinedSource).not.toContain('text-[#f3eee6]');
    expect(combinedSource).not.toContain('text-[#c8c1b5]');
    expect(combinedSource).not.toContain('text-[#a69d90]');
    expect(combinedSource).not.toContain('border-[#8b6c2f]');
    expect(combinedSource).not.toContain('bg-[#3b2f12]/80');
    expect(combinedSource).not.toContain('text-[#f2d089]');
    expect(combinedSource).not.toContain('border-[#6bb7ff]/45');
    expect(combinedSource).not.toContain('bg-[#1d6fd6]');
    expect(combinedSource).not.toContain('hover:bg-[#2a82f0]');
  });

  it('adopts shared alert authoring owners and ops tokens across the current Milestone 4 slice', () => {
    const ruleSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');
    const receiverSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-receiver-fields.tsx'), 'utf8');
    const quickDialogSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-rule-quick-dialog.tsx'), 'utf8');
    const primitiveSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-authoring-primitives.tsx'), 'utf8');

    expect(ruleSource).toContain("from './alert-authoring-primitives'");
    expect(receiverSource).toContain("from './alert-authoring-primitives'");
    expect(quickDialogSource).toContain("from './alert-authoring-primitives'");

    expect(ruleSource).toContain('data-alert-notice-rule-form-row');
    expect(ruleSource).toContain('AlertAuthoringInlineHelp');
    expect(ruleSource).toContain('AlertAuthoringRequiredMark');
    expect(ruleSource).toContain('data-alert-notice-rule-field-help={row}');
    expect(ruleSource).toContain("from '../ui/checkbox'");
    expect(ruleSource).toContain("from '../ui/date-time-range'");
    expect(ruleSource).not.toContain('AlertAuthoringFieldLabel');
    expect(ruleSource).not.toContain('AlertAuthoringToggleRow');
    expect(receiverSource).toContain('ReceiverFieldRow');
    expect(receiverSource).toContain('AlertAuthoringRequiredMark');
    expect(receiverSource).toContain('data-alert-notice-receiver-form-row={row}');
    expect(receiverSource).toContain('data-alert-notice-receiver-form="aligned-label-control"');
    expect(receiverSource).not.toContain('data-alert-notice-receiver-layout="single-column-form"');
    expect(receiverSource).toContain('data-alert-notice-receiver-select');
    expect(receiverSource).toContain('containerClassName="w-full"');
    expect(receiverSource).not.toContain('alertAuthoringSelectClassName');
    expect(quickDialogSource).toContain('AlertAuthoringCallout');
    expect(quickDialogSource).toContain('AlertAuthoringPanel');

    expect(primitiveSource).toContain('alertAuthoringSelectClassName');
    expect(primitiveSource).toContain('data-alert-authoring-panel="hertzbeat-ui-panel"');
    expect(primitiveSource).toContain('data-alert-authoring-callout="hertzbeat-ui-panel"');
    expect(primitiveSource).toContain('data-alert-authoring-action-pill="hertzbeat-ui-action"');
    expect(primitiveSource).toContain('data-alert-authoring-value-pill="hertzbeat-ui-value"');
    expect(primitiveSource).not.toContain('AlertAuthoringTextarea');
    expect(primitiveSource).not.toContain('data-alert-authoring-textarea="cold-textarea"');
    expect(primitiveSource).not.toContain('<textarea');
    expect(primitiveSource).toContain('rounded-[4px]');
    expect(primitiveSource).toContain('rounded-[3px]');
    expect(primitiveSource).not.toContain("from '../workbench/primitives'");
    expect(primitiveSource).not.toContain('rounded-[6px]');
    expect(primitiveSource).toContain('text-[var(--ops-text-primary)]');
    expect(primitiveSource).toContain('text-[var(--ops-text-secondary)]');
    expect(primitiveSource).toContain('text-[var(--ops-critical)]');
  });
});
