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

const deployKeys = [
  'action',
  'title',
  'name',
  'placeholder',
  'generate',
  'retry',
  'close',
  'identity',
  'host',
  'dockerTitle',
  'dockerHelp',
  'packageTitle',
  'packageHelp',
  'releases',
  'required'
] as const;
const failureKeys = ['permission', 'validation', 'unavailable', 'contract', 'error'] as const;

describe('Collector deployment locale contract', () => {
  it('keeps every visible key in all runtime locales', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw] as LocaleRoot[]) {
      for (const key of deployKeys) expect(locale.collectors.deploy[key]).toEqual(expect.any(String));
      for (const key of failureKeys) expect(locale.collectors.deploy.failure[key]).toEqual(expect.any(String));
    }
  });
});

type LocaleRoot = {
  collectors: {
    deploy: Record<(typeof deployKeys)[number], string> & {
      failure: Record<(typeof failureKeys)[number], string>;
    };
  };
};
