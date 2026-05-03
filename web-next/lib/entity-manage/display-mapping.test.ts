import { describe, expect, it, vi } from 'vitest';
import { entityEnvironmentLabel, entityStatusLabel, entityTypeLabel } from './display-mapping';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('entity display mapping', () => {
  it('maps common entity values to localized labels', () => {
    expect(entityTypeLabel('service', t)).toBe('服务');
    expect(entityTypeLabel('endpoint', t)).toBe('端点');
    expect(entityEnvironmentLabel('local', t)).toBe('本地');
    expect(entityStatusLabel('healthy', t)).toBe('健康');
    expect(entityStatusLabel('unknown', t)).toBe('未知');
  });
});
