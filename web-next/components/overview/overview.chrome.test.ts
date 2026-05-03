import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('overview shared chrome', () => {
  it('removes the legacy white-on-black console tokens from the shared overview components', () => {
    const consoleSource = readFileSync(resolve(process.cwd(), 'components/overview/overview-console.tsx'), 'utf8');
    const detailDialogSource = readFileSync(resolve(process.cwd(), 'components/overview/overview-detail-dialog.tsx'), 'utf8');
    const focusDialogSource = readFileSync(resolve(process.cwd(), 'components/overview/overview-problem-focus-dialog.tsx'), 'utf8');

    expect(consoleSource).not.toContain('text-white/44');
    expect(consoleSource).not.toContain('#f3eee6');
    expect(consoleSource).not.toContain('#1f232b');
    expect(detailDialogSource).not.toContain('border-white/8');
    expect(detailDialogSource).not.toContain('bg-black/20');
    expect(detailDialogSource).not.toContain('text-white/42');
    expect(focusDialogSource).not.toContain('border-white/8');
    expect(focusDialogSource).not.toContain('bg-black/20');
    expect(focusDialogSource).not.toContain('#f3eee6');
  });
});
