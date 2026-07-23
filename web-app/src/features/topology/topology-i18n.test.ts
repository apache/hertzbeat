/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('topology locale contract', () => {
  it('keeps topology copy aligned and navigation labels populated across all five locales', () => {
    const locales = [en, ja, pt, zhCn, zhTw] as unknown as LocaleCatalog[];
    const expected = flatten(locales[0]!.topology);

    locales.forEach(locale => {
      expect(locale.menu.topology.trim()).not.toBe('');
      expect(flatten(locale.topology)).toEqual(expected);
    });
    expect(expected).toContain('evidence.runtimeFailure');
    expect(expected).toContain('metrics.unavailable');
  });
});

type LocaleCatalog = { menu: { topology: string }; topology: Record<string, unknown> };

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return item && typeof item === 'object' && !Array.isArray(item)
        ? flatten(item as Record<string, unknown>, path)
        : [path];
    })
    .sort();
}
