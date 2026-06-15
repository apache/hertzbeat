import { describe, expect, it, vi } from 'vitest';
import { buildEntityDetailUrl, buildFallbackEntityDetail, loadEntityDetail, loadEntityDetailFromFacade } from './controller';
import { createTranslatorMock } from '../../test/i18n-test-helper';

describe('entity detail controller', () => {
  it('builds the entity detail url', () => {
    expect(buildEntityDetailUrl('123')).toBe('/entities/123/detail');
  });

  it('loads entity detail from the existing endpoint', async () => {
    const apiGet = vi.fn().mockResolvedValue({ entity: { entity: { id: 123 } } });
    const result = await loadEntityDetail(apiGet as any, '123');
    expect(apiGet).toHaveBeenCalledWith('/entities/123/detail');
    expect(result).toEqual({ entity: { entity: { id: 123 } } });
  });

  it('loads entity detail through the domain facade reader', async () => {
    const readEntityDetail = vi.fn().mockResolvedValue({ entity: { entity: { id: 123 } } });
    const result = await loadEntityDetailFromFacade(readEntityDetail as any, '123');

    expect(readEntityDetail).toHaveBeenCalledWith('123');
    expect(result).toEqual({ entity: { entity: { id: 123 } } });
  });

  it('keeps recoverable fallback behavior when the facade reader fails', async () => {
    const readEntityDetail = vi.fn().mockRejectedValue(new Error('Entity not exist.'));

    await expect(loadEntityDetailFromFacade(readEntityDetail as any, '123')).resolves.toEqual(buildFallbackEntityDetail('123'));
  });

  it('falls back to a generated detail workspace when the endpoint is unavailable', async () => {
    const apiGet = vi.fn().mockRejectedValue(new Error('GET /entities/123/detail failed with 404'));

    await expect(loadEntityDetail(apiGet as any, '123')).resolves.toEqual(buildFallbackEntityDetail('123'));
  });

  it('marks fallback detail as unavailable instead of a real empty entity', () => {
    const detail = buildFallbackEntityDetail('123');

    expect(detail.detailState).toEqual({
      state: 'unavailable',
      message: 'Detail unavailable',
      reason: 'recoverable-detail-load-failed'
    });
    expect(detail.entity?.entity?.status).toBe('unavailable');
    expect(detail.entity?.entity?.source).toBe('unavailable');
    expect(detail.entity?.entity?.environment).toBeUndefined();
  });

  it('treats the legacy Entity not exist response as a recoverable detail fallback', async () => {
    const apiGet = vi.fn().mockRejectedValue(new Error('Entity not exist.'));

    await expect(loadEntityDetail(apiGet as any, '123')).resolves.toEqual(buildFallbackEntityDetail('123'));
  });

  it('localizes recoverable fallback copy through runtime messages', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const detail = buildFallbackEntityDetail('123', t);

    expect(detail.entity.entity.displayName).toBe(t('entities.detail.fallback.display-name', { id: 123 }));
    expect(detail.entity.entity.description).toBe(t('entities.detail.fallback.description'));
    expect(detail.nextActions?.[0]).toEqual(
      expect.objectContaining({
        title: t('entities.detail.action-text.open-definition'),
        summary: t('entities.detail.action-text.review-definition'),
        actionLabel: t('entities.detail.action-text.open-definition')
      })
    );
  });
});
