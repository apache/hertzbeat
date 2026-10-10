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

import enUS from '@/assets/i18n/en-us.json';
import jaJP from '@/assets/i18n/ja-jp.json';
import ptBR from '@/assets/i18n/pt-br.json';
import zhCN from '@/assets/i18n/zh-cn.json';
import zhTW from '@/assets/i18n/zh-tw.json';

describe('entity evidence source locale contract', () => {
  it.each([enUS, jaJP, ptBR, zhCN, zhTW])('keeps the complete visible provenance vocabulary', locale => {
    expect(Object.keys(locale.entity.evidence.sources).sort()).toEqual([
      'empty',
      'latest',
      'logs',
      'metrics',
      'monitor',
      'notObserved',
      'otlp',
      'title',
      'traces',
      'unavailable'
    ]);
    expect(Object.values(locale.entity.evidence.sources).every(value => value.length > 0)).toBe(true);
  });
});
