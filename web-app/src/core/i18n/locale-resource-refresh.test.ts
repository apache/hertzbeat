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

import { beforeAll, describe, expect, it } from 'vitest';
import en from '@/assets/i18n/en-us.json';
import zh from '@/assets/i18n/zh-cn.json';
import { i18n, initializeI18n, loadLocale, replaceLocaleRootMessages } from './i18n';

beforeAll(async () => {
  await initializeI18n();
});
describe('live root catalog replacement', () => {
  it('refreshes an already loaded locale and publishes the numbered risk copy without changing locale', async () => {
    await loadLocale('en-US');
    i18n.removeResourceBundle('en-US', 'translation');
    i18n.addResourceBundle('en-US', 'translation', { aiWorkspace: { title: 'Old title' } });
    expect(i18n.t('aiWorkspace.permission.wait', { seconds: 5 })).toBe('aiWorkspace.permission.wait');
    replaceLocaleRootMessages('en-US', en);
    expect(i18n.t('aiWorkspace.permission.wait', { seconds: 5 })).toContain('5');
    expect(i18n.t('aiWorkspace.permission.label')).toBe('Approval mode');
    expect(i18n.resolvedLanguage).toBe('en-US');
    expect(i18n.exists('exploreInvestigation.title')).toBe(true);
  });
  it('updates an inactive locale without switching the active language', async () => {
    await loadLocale('en-US');
    replaceLocaleRootMessages('zh-CN', zh);
    expect(i18n.resolvedLanguage).toBe('en-US');
    await loadLocale('zh-CN');
    const copy = i18n.t('aiWorkspace.permission.wait', { seconds: 4 });
    expect(copy).toContain('4');
    expect(copy).not.toContain('aiWorkspace.');
  });
});
