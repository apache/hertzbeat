/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { SearchOptions } from './explore-log-search-options';

afterEach(cleanup);
const t = ((key: string) => key) as TFunction;
it.each([
  ['service:"İabc"', 'abc', 'abc', 'service:"İ', '"'],
  ['service:"İİAbCabc"', 'ABC', 'AbC', 'service:"İİ', 'abc"'],
  ['service:"abcabc"', 'AbC', 'abc', 'service:"', 'abc"'],
  ['service:"İabc"', 'İ', 'İ', 'service:"', 'abc"'],
  ['env:"İabc"', 'i', 'İ', 'env:"', 'abc"'],
  ['service:"İabc"', '\u0307a', 'İa', 'service:"', 'bc"'],
  ['service:"😀İabc"', 'ABC', 'abc', 'service:"😀İ', '"'],
  ['service:"İ😀abc"', '😀a', '😀a', 'service:"İ', 'bc"'],
  ['service:"İ😀abc"', '\uDE00', '😀', 'service:"İ', 'abc"'],
  ['service:"İ𐐀abc"', '𐐨', '𐐀', 'service:"İ', 'abc"'],
  ['service:"ΟΣ abc"', 'ος', 'ΟΣ', 'service:"', ' abc"'],
  ['service:"<İabc & value>"', 'abc', 'abc', 'service:"<İ', ' & value>"']
])('maps %s / %s to complete original code points', (label, prefix, match, before, after) => {
  const accept = vi.fn();
  render(
    <SearchOptions
      options={[{ value: label, label, fieldValue: false }]}
      selected={0}
      prefix={prefix}
      id="unicode"
      accept={accept}
      suggestions={undefined}
      recentQueries={[]}
      restoreRecentQuery={vi.fn()}
      t={t}
    />
  );
  const option = screen.getByRole('option', { name: label });
  const mark = option.querySelector('mark')!;
  expect(mark).not.toBeNull();
  expect(mark.textContent).toBe(match);
  expect(mark.previousSibling?.textContent ?? '').toBe(before);
  expect(mark.nextSibling?.textContent ?? '').toBe(after);
  expect(mark.parentElement?.textContent).toBe(label);
  expect(option.querySelectorAll('mark')).toHaveLength(1);
  expect(option.querySelector('value')).toBeNull();
  fireEvent.click(option);
  expect(accept).toHaveBeenCalledWith(0);
});
it.each(['', 'missing'])('leaves a label unchanged without a matching prefix %s', prefix => {
  const label = 'service:"İ😀abc"';
  render(
    <SearchOptions
      options={[{ value: label, label, fieldValue: false }]}
      selected={0}
      prefix={prefix}
      id="unicode"
      accept={vi.fn()}
      suggestions={undefined}
      recentQueries={[]}
      restoreRecentQuery={vi.fn()}
      t={t}
    />
  );
  const option = screen.getByRole('option', { name: label });
  expect(option.querySelector('mark')).toBeNull();
  expect(option).toHaveTextContent(label);
});
