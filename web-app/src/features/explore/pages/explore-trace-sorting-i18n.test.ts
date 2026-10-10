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

import { describe, expect, it } from 'vitest';
import en from '@/assets/i18n/explore/en-us.json';
import ja from '@/assets/i18n/explore/ja-jp.json';
import pt from '@/assets/i18n/explore/pt-br.json';
import zh from '@/assets/i18n/explore/zh-cn.json';
import tw from '@/assets/i18n/explore/zh-tw.json';

describe('Trace ordering, coverage and evidence reason localization', () => {
  it.each([en, ja, pt, zh, tw])('includes every supported reason and sort/coverage state', catalog => {
    for (const key of ['label', 'newest', 'duration_desc'] as const)
      expect(catalog.exploreTrace.sort[key].trim()).not.toBe('');
    for (const key of ['window', 'bounded', 'truncated', 'boundedUnknown', 'unknown'] as const)
      expect(catalog.exploreTrace.coverage[key].trim()).not.toBe('');
    for (const key of [
      'no_data',
      'not_found',
      'not_correlated',
      'storage_unavailable',
      'malformed_data',
      'limit_exceeded',
      'identity_unavailable',
      'upstream_unavailable',
      'query_strategy_unavailable'
    ] as const)
      expect(catalog.exploreInvestigation.reasons[key].trim()).not.toBe('');
  });
});
