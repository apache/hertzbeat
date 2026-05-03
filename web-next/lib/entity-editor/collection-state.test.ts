import { describe, expect, it } from 'vitest';
import { addJsonRow, addObjectRow, ensureJsonRows, ensureObjectRows, removeJsonRow, removeObjectArrayItem, updateJsonRow, updateObjectArrayItem } from './collection-state';

describe('entity editor collection state helpers', () => {
  it('ensures object rows exist', () => {
    expect(ensureObjectRows([])).toEqual([{}]);
    expect(ensureObjectRows([{ name: 'ops' }])).toEqual([{ name: 'ops' }]);
  });

  it('updates object array items by index', () => {
    expect(updateObjectArrayItem([{ name: 'ops' }, { name: 'dev' }], 1, { name: 'platform' })).toEqual([
      { name: 'ops' },
      { name: 'platform' }
    ]);
  });

  it('removes object items but keeps one empty object', () => {
    expect(removeObjectArrayItem([{ name: 'ops' }], 0)).toEqual([{}]);
    expect(removeObjectArrayItem([{ name: 'ops' }, { name: 'dev' }], 0)).toEqual([{ name: 'dev' }]);
  });

  it('adds a new empty object row', () => {
    expect(addObjectRow([{ name: 'ops' }])).toEqual([{ name: 'ops' }, {}]);
  });

  it('ensures json rows exist', () => {
    expect(ensureJsonRows([])).toEqual(['{}']);
    expect(ensureJsonRows(['{"a":1}'])).toEqual(['{"a":1}']);
  });

  it('updates json rows by index', () => {
    expect(updateJsonRow(['{}', '{"a":1}'], 1, '{"b":2}')).toEqual(['{}', '{"b":2}']);
  });

  it('removes json rows but keeps one default object row', () => {
    expect(removeJsonRow(['{}'], 0)).toEqual(['{}']);
    expect(removeJsonRow(['{}', '{"a":1}'], 0)).toEqual(['{"a":1}']);
  });

  it('adds a new default json row', () => {
    expect(addJsonRow(['{}'])).toEqual(['{}', '{}']);
  });
});
