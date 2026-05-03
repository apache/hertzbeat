import { describe, expect, it, vi } from 'vitest';
import type { SingleAlert } from '@/lib/types';
import { alertSeverityLabel, alertStatusLabel } from './display-mapping';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('alert display mapping', () => {
  it('maps severity from common label keys', () => {
    expect(alertSeverityLabel({ labels: { severity: 'critical' } } as unknown as SingleAlert, t)).toBe('CRITICAL');
    expect(alertSeverityLabel({ labels: { level: 'warning' } } as unknown as SingleAlert, t)).toBe('WARNING');
    expect(alertSeverityLabel({ labels: { priority: 'emergency' } } as unknown as SingleAlert, t)).toBe('EMERGENCY');
  });

  it('falls back to localized generic alert label', () => {
    expect(alertSeverityLabel({ labels: {} } as unknown as SingleAlert, t)).toBe('告警');
  });

  it('maps common alert status values to localized labels', () => {
    expect(alertStatusLabel('firing', t)).toBe('触发中');
    expect(alertStatusLabel('resolved', t)).toBe('已恢复');
    expect(alertStatusLabel('suppressed', t)).toBe('已抑制');
  });
});
