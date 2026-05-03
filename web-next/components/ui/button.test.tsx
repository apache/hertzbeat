import { describe, expect, it } from 'vitest';
import { buttonVariants } from './button';

describe('button variants', () => {
  it('uses HertzBeat cold-workbench chrome', () => {
    const primary = buttonVariants({ variant: 'primary' });
    const subtle = buttonVariants({ variant: 'subtle' });

    expect(primary).toContain('h-8');
    expect(primary).toContain('min-w-[96px]');
    expect(primary).toContain('rounded-[2px]');
    expect(primary).toContain('bg-[var(--ops-primary)]');
    expect(primary).toContain('border-[var(--ops-primary)]');
    expect(subtle).toContain('bg-[var(--ops-surface-panel)]');
    expect(subtle).toContain('border-[var(--ops-border-color)]');
  });

  it('standardizes non-icon button widths so adjacent actions do not jump by label length', () => {
    expect(buttonVariants({ size: 'sm' })).toContain('min-w-[88px]');
    expect(buttonVariants({ size: 'default' })).toContain('min-w-[96px]');
    expect(buttonVariants({ size: 'lg' })).toContain('min-w-[112px]');
    expect(buttonVariants({ size: 'icon' })).toContain('w-8');
    expect(buttonVariants({ size: 'icon' })).not.toContain('min-w-');
  });
});
