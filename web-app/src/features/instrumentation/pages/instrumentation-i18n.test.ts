/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('instrumentation locale contract', () => {
  it('keeps the onboarding catalog aligned across all runtime locales', () => {
    const expected = flatten((en as LocaleRoot).instrumentation);
    for (const locale of [ja, pt, zhCn, zhTw] as LocaleRoot[]) {
      expect(flatten(locale.instrumentation)).toEqual(expected);
    }
    expect(expected).toContain('title');
    expect(expected).toContain('detection.status.unavailable');
  });

  it('localizes representative visible guidance and operational states', () => {
    for (const locale of [ja, pt, zhCn, zhTw] as LocaleRoot[]) {
      const unchanged = localizedSentinels.filter(
        path => readString(locale.instrumentation, path) === readString(en.instrumentation, path)
      );
      expect(unchanged).toEqual([]);
    }
  });
});

type LocaleRoot = { instrumentation: Record<string, unknown> };

const localizedSentinels = [
  'title',
  'description',
  'scopeHelp',
  'catalogUnavailable',
  'tokenCopyNotice',
  'tokenInMemory',
  'copyFailed',
  'stage.environmentHelp',
  'stage.contextHelp',
  'stage.detectHelp',
  'field.deploymentEnvironment',
  'field.tokenMemory',
  'action.continue',
  'method.zero_code',
  'method.sdk',
  'capability.preview',
  'detection.waiting',
  'detection.status.waiting',
  'detection.status.received',
  'detection.status.unsupported',
  'detection.status.unavailable',
  'detection.status.error',
  'detection.error.authentication_failed'
] as const;

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

function readString(value: Record<string, unknown>, path: string): string {
  const result = path.split('.').reduce<unknown>((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, value);
  if (typeof result !== 'string') throw new Error(`Missing localized instrumentation string: ${path}`);
  return result;
}
