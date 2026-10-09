/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { serializeCsv } from './csv';
describe('spreadsheet-safe CSV serialization', () => {
  it('quotes delimiters and guards formula prefixes after leading control characters', () => {
    expect(
      serializeCsv([
        ['a,"b"\nc', null, undefined, 0],
        ['=1', ' +1', '\t-1', '\u0000@x']
      ])
    ).toBe('"a,""b""\nc","","","0"\r\n"\'=1","\' +1","\'\t-1","\'\u0000@x"');
  });
});

it('keeps finite negative numbers numeric while guarding negative strings', () => {
  expect(serializeCsv([[-1, '-1', -0, 1e-20]])).toBe('"-1","\'-1","0","1e-20"');
  expect(() => serializeCsv([[Infinity]])).toThrow();
  expect(() => serializeCsv([[NaN]])).toThrow();
});
