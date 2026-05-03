import { describe, expect, it, vi } from 'vitest';
import {
  applyWorkbenchTheme,
  bootstrapWorkbenchTheme,
  normalizeWorkbenchTheme,
  readWorkbenchTheme,
  reloadWorkbenchWindow
} from './workbench-theme';

describe('workbench theme helpers', () => {
  it('normalizes supported theme aliases into the shared theme set', () => {
    expect(normalizeWorkbenchTheme('dark-ops')).toBe('dark-ops');
    expect(normalizeWorkbenchTheme('light-ops')).toBe('light-ops');
    expect(normalizeWorkbenchTheme('default')).toBe('light-ops');
    expect(normalizeWorkbenchTheme('compact')).toBe('compact');
    expect(normalizeWorkbenchTheme('unknown')).toBe('dark-ops');
    expect(normalizeWorkbenchTheme(null)).toBe('dark-ops');
  });

  it('reads the stored theme with a dark-ops fallback', () => {
    expect(readWorkbenchTheme({ getItem: () => 'compact' })).toBe('compact');
    expect(readWorkbenchTheme({ getItem: () => 'default' })).toBe('light-ops');
    expect(readWorkbenchTheme({ getItem: () => null })).toBe('dark-ops');
  });

  it('applies the normalized theme to document state and storage', () => {
    const setAttribute = vi.fn();
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    const theme = applyWorkbenchTheme('default', {
      documentLike: {
        documentElement: { setAttribute } as any,
        body: { setAttribute } as any
      },
      storage
    });

    expect(theme).toBe('light-ops');
    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'light-ops');
    expect(storage.setItem).toHaveBeenCalledWith('theme', 'light-ops');
  });

  it('bootstraps the stored theme into the current document', () => {
    const setAttribute = vi.fn();
    const storage = {
      getItem: vi.fn(() => 'compact'),
      setItem: vi.fn()
    };

    expect(
      bootstrapWorkbenchTheme({
        documentLike: {
          documentElement: { setAttribute } as any,
          body: { setAttribute } as any
        },
        storage
      })
    ).toBe('compact');
    expect(storage.getItem).toHaveBeenCalledWith('theme');
    expect(storage.setItem).toHaveBeenCalledWith('theme', 'compact');
  });

  it('reloads the current workbench window when requested', () => {
    const reload = vi.fn();
    reloadWorkbenchWindow({ reload } as any);
    expect(reload).toHaveBeenCalled();
  });
});
