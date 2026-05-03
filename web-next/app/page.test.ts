import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('root alias route', () => {
  it('redirects the shell entry point to the overview workbench', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: HomePage } = await import('./page');

    expect(() => HomePage()).toThrow('redirect:/overview');
    expect(redirect).toHaveBeenCalledWith('/overview');
  });
});
