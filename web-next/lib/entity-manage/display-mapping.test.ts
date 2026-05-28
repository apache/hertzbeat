import { describe, expect, it, vi } from 'vitest';
import { entityEnvironmentLabel, entityStatusLabel, entityTypeLabel } from './display-mapping';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });
const missingT = (key: string) => key;

describe('entity display mapping', () => {
  it('maps common entity values to localized labels', () => {
    expect(entityTypeLabel('service', t)).toBe('服务');
    expect(entityTypeLabel('endpoint', t)).toBe('端点');
    expect(entityEnvironmentLabel('local', t)).toBe('本地');
    expect(entityStatusLabel('healthy', t)).toBe('健康');
    expect(entityStatusLabel('unknown', t)).toBe('未知');
  });

  it('maps English entity identity labels without localized fallback text', () => {
    const labels = [
      entityTypeLabel('service', enT),
      entityEnvironmentLabel('local', enT),
      entityStatusLabel('unknown', enT)
    ];

    expect(labels).toEqual(['Service', 'Local', 'Unknown']);
    labels.forEach(label => expect(label).not.toMatch(/[\u4e00-\u9fff]/));
  });

  it('falls back to English labels when runtime messages are unavailable', () => {
    const labels = [
      entityTypeLabel('database', missingT),
      entityTypeLabel('device', missingT),
      entityTypeLabel('endpoint', missingT),
      entityTypeLabel('host', missingT),
      entityTypeLabel('k8s-workload', missingT),
      entityTypeLabel('middleware', missingT),
      entityTypeLabel('queue', missingT),
      entityTypeLabel('system', missingT),
      entityStatusLabel('critical', missingT),
      entityStatusLabel('down', missingT),
      entityStatusLabel('healthy', missingT),
      entityStatusLabel('offline', missingT),
      entityStatusLabel('unhealthy', missingT),
      entityStatusLabel('warning', missingT)
    ];

    expect(labels).toEqual([
      'Database',
      'Device',
      'Endpoint',
      'Host',
      'K8s workload',
      'Middleware',
      'Queue',
      'System',
      'Critical',
      'Offline',
      'Healthy',
      'Offline',
      'Unhealthy',
      'Warning'
    ]);
    labels.forEach(label => expect(label).not.toMatch(/[\u4e00-\u9fff]/));
  });

  it('uses localized empty fallback for missing entity identity labels', () => {
    expect(entityTypeLabel('', t)).toBe('无');
    expect(entityEnvironmentLabel(null, t)).toBe('无');
    expect(entityStatusLabel(undefined, t)).toBe('无');

    expect(entityTypeLabel('', enT)).toBe('None');
    expect(entityEnvironmentLabel(null, enT)).toBe('None');
    expect(entityStatusLabel(undefined, enT)).toBe('None');

    expect(entityTypeLabel('', missingT)).toBe('None');
    expect(entityEnvironmentLabel(null, missingT)).toBe('None');
    expect(entityStatusLabel(undefined, missingT)).toBe('None');
  });
});
