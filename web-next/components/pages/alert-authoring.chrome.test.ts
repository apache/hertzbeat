import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('alert authoring cold-workbench chrome', () => {
  it('removes the remaining legacy white-on-black authoring chrome from the current Milestone 4 slice', () => {
    const groupSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-group-authoring-fields.tsx'), 'utf8');
    const inhibitSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-authoring-fields.tsx'), 'utf8');
    const silenceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-authoring-fields.tsx'), 'utf8');
    const noticeSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-template-fields.tsx'), 'utf8');
    const combinedSource = [groupSource, inhibitSource, silenceSource, noticeSource].join('\n');

    expect(combinedSource).not.toContain('rounded-[16px]');
    expect(combinedSource).not.toContain('rounded-[14px]');
    expect(combinedSource).not.toContain('rounded-[12px]');
    expect(combinedSource).not.toContain('border-white/8');
    expect(combinedSource).not.toContain('border-white/10');
    expect(combinedSource).not.toContain('bg-white/[0.025]');
    expect(combinedSource).not.toContain('bg-white/[0.03]');
    expect(combinedSource).not.toContain('bg-white/[0.04]');
    expect(combinedSource).not.toContain('bg-black/20');
    expect(combinedSource).not.toContain('text-white/72');
    expect(combinedSource).not.toContain('text-white/40');
    expect(combinedSource).not.toContain('text-[#d2cbc0]');
    expect(combinedSource).not.toContain('text-[#e7dfd1]');
    expect(combinedSource).not.toContain('text-[#f3eee6]');
    expect(combinedSource).not.toContain('text-[#c8c1b5]');
    expect(combinedSource).not.toContain('text-[#f2d089]');
  });

  it('adopts shared alert authoring owners and ops tokens across the current Milestone 4 slice', () => {
    const groupSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-group-authoring-fields.tsx'), 'utf8');
    const inhibitSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-authoring-fields.tsx'), 'utf8');
    const silenceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-authoring-fields.tsx'), 'utf8');
    const noticeSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-template-fields.tsx'), 'utf8');
    const primitivePath = resolve(process.cwd(), 'components/pages/alert-authoring-primitives.tsx');

    expect(existsSync(primitivePath)).toBe(true);

    const primitiveSource = readFileSync(primitivePath, 'utf8');

    expect(groupSource).toContain("from './alert-authoring-primitives'");
    expect(inhibitSource).toContain("from './alert-authoring-primitives'");
    expect(silenceSource).toContain("from './alert-authoring-primitives'");
    expect(noticeSource).not.toContain("from './alert-authoring-primitives'");
    expect(noticeSource).toContain("from '@hertzbeat/ui'");
    expect(noticeSource).toContain('HzCodeEditor');
    expect(noticeSource).toContain('data-alert-notice-template-code-editor="template-content"');
    expect(noticeSource).not.toContain('AlertAuthoringTextarea');
    expect(noticeSource).not.toContain('EditorRow');

    expect(primitiveSource).not.toContain("from '../workbench/primitives'");
    expect(primitiveSource).not.toContain('WorkbenchToolbarAction');
    expect(primitiveSource).not.toContain('WorkbenchValuePill');
    expect(primitiveSource).not.toContain('AlertAuthoringTextarea');
    expect(primitiveSource).not.toContain('data-alert-authoring-textarea="cold-textarea"');
    expect(primitiveSource).not.toContain('<textarea');
    expect(primitiveSource).not.toContain('const alertAuthoringPillClassName =');
    expect(primitiveSource).not.toContain('const alertAuthoringValuePillClassName =');
    expect(primitiveSource).toContain('border-[var(--ops-border-color)]');
    expect(primitiveSource).toContain('border-[#2b3039]');
    expect(primitiveSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(primitiveSource).toContain('bg-[var(--ops-surface-raised)]');
    expect(primitiveSource).toContain('bg-[#101217]');
    expect(primitiveSource).toContain('text-[var(--ops-text-primary)]');
    expect(primitiveSource).toContain('text-[var(--ops-text-secondary)]');
    expect(primitiveSource).toContain('rounded-[3px]');
    expect(primitiveSource).toContain('rounded-[4px]');
  });
});
