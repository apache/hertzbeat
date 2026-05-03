import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('entities not-found boundary', () => {
  it('redirects unknown nested entity paths back to the entities list', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: EntitiesNotFound } = await import('./not-found');

    expect(() => EntitiesNotFound()).toThrow('redirect:/entities');
    expect(redirect).toHaveBeenCalledWith('/entities');
  });
});
