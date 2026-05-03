import { describe, expect, it } from 'vitest';
import { appendCommaSeparatedValue, ensureKeyValueRows, removeRowAt, seedFirstLinkProvider, updateRowAt } from './editor-state';

describe('entity editor state helpers', () => {
  it('ensures at least one key/value row', () => {
    expect(ensureKeyValueRows([])).toEqual([{ key: '', value: '' }]);
    expect(ensureKeyValueRows([{ key: 'a', value: 'b' }])).toEqual([{ key: 'a', value: 'b' }]);
  });

  it('updates a row by index', () => {
    expect(
      updateRowAt(
        [{ key: 'a', value: '1' }, { key: 'b', value: '2' }],
        1,
        { value: '3' }
      )
    ).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '3' }
    ]);
  });

  it('removes a row but keeps one empty row minimum', () => {
    expect(removeRowAt([{ key: 'a', value: '1' }], 0)).toEqual([{ key: '', value: '' }]);
    expect(removeRowAt([{ key: 'a', value: '1' }, { key: 'b', value: '2' }], 0)).toEqual([{ key: 'b', value: '2' }]);
  });

  it('appends comma separated values without duplicates', () => {
    expect(appendCommaSeparatedValue('java, typescript', 'go')).toBe('java, typescript, go');
    expect(appendCommaSeparatedValue('java, typescript', 'java')).toBe('java, typescript');
  });

  it('seeds the first link provider row', () => {
    expect(seedFirstLinkProvider([], 'grafana')).toEqual([{ provider: 'grafana' }]);
    expect(seedFirstLinkProvider([{ name: 'runbook' }], 'grafana')).toEqual([{ name: 'runbook', provider: 'grafana' }]);
  });
});
