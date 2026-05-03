import { describe, expect, it } from 'vitest';
import { attributeRows, statusTone } from './display-mapping';

describe('trace display mapping', () => {
  it('maps status strings to tones', () => {
    expect(statusTone('STATUS_CODE_ERROR')).toBe('danger');
    expect(statusTone('UNSET')).toBe('warning');
    expect(statusTone('OK')).toBe('success');
    expect(statusTone(undefined)).toBeUndefined();
  });

  it('maps attributes into row objects', () => {
    expect(attributeRows({ 'db.system': 'postgres', region: 'cn' }, 'resource')).toEqual([
      { title: 'db.system', copy: 'postgres', meta: 'attribute' },
      { title: 'region', copy: 'cn', meta: 'attribute' }
    ]);
  });
});
