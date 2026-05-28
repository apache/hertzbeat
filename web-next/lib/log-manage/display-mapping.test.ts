import { describe, expect, it } from 'vitest';
import { attributeRows, logSeverityTone, severityLabel } from './display-mapping';

describe('log display mapping', () => {
  it('maps severity from text or number', () => {
    expect(severityLabel({ severityText: 'ERROR' })).toBe('ERROR');
    expect(severityLabel({ severityNumber: 9 })).toBe('9');
    expect(severityLabel({})).toBe('LOG');
  });

  it('maps severity tone from text and OTLP severity numbers', () => {
    expect(logSeverityTone('ERROR')).toBe('danger');
    expect(logSeverityTone('FATAL')).toBe('danger');
    expect(logSeverityTone(17)).toBe('danger');
    expect(logSeverityTone('WARN')).toBe('warning');
    expect(logSeverityTone(13)).toBe('warning');
    expect(logSeverityTone('INFO')).toBe('success');
    expect(logSeverityTone(9)).toBe('success');
    expect(logSeverityTone('DEBUG')).toBe('neutral');
  });

  it('maps attributes into row objects', () => {
    expect(attributeRows({ service: 'checkout', retries: 2 }, 'resource')).toEqual([
      { title: 'service', copy: 'checkout', meta: 'resource' },
      { title: 'retries', copy: '2', meta: 'resource' }
    ]);
  });
});
