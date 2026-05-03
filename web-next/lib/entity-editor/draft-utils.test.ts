import { describe, expect, it } from 'vitest';
import { fromKeyValueDraft, normalizeTags, parseCommaSeparated, toKeyValueDraft, uniqueSuggestions } from './draft-utils';

describe('entity editor draft utils', () => {
  it('deduplicates and truncates suggestions', () => {
    expect(uniqueSuggestions(['a', 'b', 'a', '', 'c', 'd', 'e', 'f', 'g', 'h', 'i'])).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });

  it('parses comma separated values', () => {
    expect(parseCommaSeparated('a, b , ,c')).toEqual(['a', 'b', 'c']);
  });

  it('creates key/value draft rows from a record', () => {
    expect(toKeyValueDraft({ severity: 'warning', service: 'checkout' })).toEqual([
      { key: 'severity', value: 'warning' },
      { key: 'service', value: 'checkout' }
    ]);
  });

  it('returns one empty row for an empty record', () => {
    expect(toKeyValueDraft()).toEqual([{ key: '', value: '' }]);
  });

  it('builds a record from key/value draft rows', () => {
    expect(
      fromKeyValueDraft([
        { key: 'severity', value: 'warning' },
        { key: ' service ', value: ' checkout ' },
        { key: '', value: 'skip' }
      ])
    ).toEqual({
      severity: 'warning',
      service: 'checkout'
    });
  });

  it('normalizes tags', () => {
    expect(normalizeTags('prod, critical , , customer-facing')).toEqual(['prod', 'critical', 'customer-facing']);
  });
});
