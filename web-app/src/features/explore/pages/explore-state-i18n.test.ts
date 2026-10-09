/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/explore/en-us.json';
import ja from '@/assets/i18n/explore/ja-jp.json';
import pt from '@/assets/i18n/explore/pt-br.json';
import zhCn from '@/assets/i18n/explore/zh-cn.json';
import zhTw from '@/assets/i18n/explore/zh-tw.json';

const stateKeys = [
  'unsupportedQuery',
  'storageUnavailable',
  'transportError',
  'contractError',
  'refreshing',
  'staleError'
] as const;
const persesKeys = [
  'runtimeError',
  'contract',
  'logsTable',
  'tracesTable',
  'pagination',
  'pageStatus',
  'investigateLogAction',
  'openTraceAction',
  'notRecorded'
] as const;
const queryLabelKeys = ['metrics', 'logs', 'traces'] as const;

describe('Explore result state locale contract', () => {
  it('uses the current page-status label without the obsolete requested-page label', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.explore.perses.pageStatus).toEqual(expect.any(String));
      expect(locale.explore.perses).not.toHaveProperty('requestedPage');
    }
  });

  it('keeps every honest result state available in all runtime locales', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw] as LocaleRoot[]) {
      for (const key of stateKeys) expect(locale.explore.states[key]).toEqual(expect.any(String));
      for (const key of persesKeys) expect(locale.explore.perses[key]).toEqual(expect.any(String));
      expect(locale.explore.perses.traceTable.investigate).toEqual(expect.any(String));
      expect(locale.explore.addFilters).toEqual(expect.any(String));
      expect(locale.explore.queryToolbar).toEqual(expect.any(String));
      expect(locale.explore.filterContext).toEqual(expect.any(String));
      expect(locale.exploreTrace.attributeFilter).toEqual(expect.any(String));
      for (const key of queryLabelKeys) expect(locale.explore.queryLabels[key]).toEqual(expect.any(String));
    }
  });
});

type LocaleRoot = {
  exploreTrace: { attributeFilter: string };
  explore: {
    states: Record<(typeof stateKeys)[number], string>;
    perses: Record<(typeof persesKeys)[number], string> & { traceTable: { investigate: string } };
    addFilters: string;
    queryToolbar: string;
    filterContext: string;
    queryLabels: Record<(typeof queryLabelKeys)[number], string>;
  };
};
