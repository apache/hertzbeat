/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { investigationPrimitiveMessages } from '../components/explore-investigation-messages';

import en from '@/assets/i18n/explore/en-us.json';
import ja from '@/assets/i18n/explore/ja-jp.json';
import pt from '@/assets/i18n/explore/pt-br.json';
import zhCn from '@/assets/i18n/explore/zh-cn.json';
import zhTw from '@/assets/i18n/explore/zh-tw.json';

const sectionKeys = ['traces', 'logs', 'metrics', 'topology', 'selectedLog', 'nearbyLogs'] as const;
const stateKeys = ['available', 'empty', 'unavailable', 'noTraceContext'] as const;
const actionKeys = ['backToResults', 'openLogs', 'openMetrics', 'openTopology', 'focusTrace'] as const;
const queryKeys = [
  'loading',
  'empty',
  'truncated',
  'truncationUnknown',
  'runtimeError',
  'invalid',
  'permission',
  'overloaded',
  'unavailable',
  'contract'
] as const;

describe('Explore focused investigation locale contract', () => {
  beforeAll(() => initializeI18n());

  it.each(['en-US', 'ja-JP', 'pt-BR', 'zh-CN', 'zh-TW'] as const)(
    'resolves every primitive message in runtime locale %s',
    async locale => {
      await loadLocale(locale);
      for (const key of queryKeys) {
        expect(i18n.getResource(locale, 'translation', `exploreInvestigation.query.${key}`)).toEqual(
          expect.any(String)
        );
      }
      const { failures, ...messages } = investigationPrimitiveMessages(i18n.getFixedT(locale));
      for (const value of [...Object.values(messages), ...Object.values(failures)]) {
        if (typeof value !== 'string') throw new Error('Expected a translated message string');
        expect(value).not.toMatch(/^exploreInvestigation\./u);
        expect(value.trim()).not.toBe('');
      }
    }
  );

  it('keeps the focused Trace and Log workspace copy aligned in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw] as LocaleRoot[]) {
      expect(locale.exploreInvestigation.title).toEqual(expect.any(String));
      expect(locale.exploreInvestigation.exactWindow).toEqual(expect.any(String));
      expect(locale.exploreInvestigation.availability).toEqual(expect.any(String));
      for (const key of sectionKeys) expect(locale.exploreInvestigation.sections[key]).toEqual(expect.any(String));
      for (const key of stateKeys) expect(locale.exploreInvestigation.states[key]).toEqual(expect.any(String));
      for (const key of actionKeys) expect(locale.exploreInvestigation.actions[key]).toEqual(expect.any(String));
      expect(locale.exploreInvestigation.metrics.service).toEqual(expect.any(String));
      for (const key of queryKeys) expect(locale.exploreInvestigation.query[key]).toEqual(expect.any(String));
    }
  });
});

type LocaleRoot = {
  exploreInvestigation: {
    title: string;
    exactWindow: string;
    availability: string;
    sections: Record<(typeof sectionKeys)[number], string>;
    states: Record<(typeof stateKeys)[number], string>;
    actions: Record<(typeof actionKeys)[number], string>;
    metrics: { service: string };
    query: Record<(typeof queryKeys)[number], string>;
  };
};
