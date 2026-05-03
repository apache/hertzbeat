import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('entities catch-all route', () => {
  it('redirects unknown nested entity paths back to the entities list', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: EntityUnknownRoutePage } = await import('./page');

    expect(() => EntityUnknownRoutePage()).toThrow('redirect:/entities');
    expect(redirect).toHaveBeenCalledWith('/entities');
  });
});
