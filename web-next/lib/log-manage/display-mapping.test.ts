import { describe, expect, it } from 'vitest';
import { attributeRows, severityLabel } from './display-mapping';

describe('log display mapping', () => {
  it('maps severity from text or number', () => {
    expect(severityLabel({ severityText: 'ERROR' })).toBe('ERROR');
    expect(severityLabel({ severityNumber: 9 })).toBe('9');
    expect(severityLabel({})).toBe('LOG');
  });

  it('maps attributes into row objects', () => {
    expect(attributeRows({ service: 'checkout', retries: 2 }, 'resource')).toEqual([
      { title: 'service', copy: 'checkout', meta: 'resource' },
      { title: 'retries', copy: '2', meta: 'resource' }
    ]);
  });
});
