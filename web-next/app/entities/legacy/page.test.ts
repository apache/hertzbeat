import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('legacy entities route', () => {
  it('redirects the obsolete single-segment route to the entity catalog with query context', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: LegacyEntitiesPage } = await import('./page');

    await expect(
      LegacyEntitiesPage({
        searchParams: Promise.resolve({
          search: 'checkout',
          source: 'product-design-audit'
        })
      })
    ).rejects.toThrow(
      'redirect:/entities?search=checkout&source=product-design-audit'
    );
    expect(redirect).toHaveBeenCalledWith(
      '/entities?search=checkout&source=product-design-audit'
    );
  });
});
