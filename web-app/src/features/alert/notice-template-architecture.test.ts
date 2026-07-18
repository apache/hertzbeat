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

const sources = import.meta.glob('./**/*notice-template*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
});

describe('Notice Template architecture', () => {
  it('keeps transport, resource state, and presentation in explicit owners', () => {
    const page = String(sources['./notice-template-page.tsx'] ?? '');
    const controller = String(sources['./notice-template-controller.ts'] ?? '');
    const queryController = String(sources['./controller/use-notice-template-query-controller.ts'] ?? '');
    const listController = String(sources['./controller/use-notice-template-list-controller.ts'] ?? '');
    const commandController = String(sources['./controller/use-notice-template-command-controller.ts'] ?? '');
    const commandState = String(sources['./controller/notice-template-command-state.ts'] ?? '');
    const removeController = String(sources['./controller/use-notice-template-remove.ts'] ?? '');
    const api = String(sources['./notice-template-api.ts'] ?? '');
    const domainModel = String(sources['./notice-template-model.ts'] ?? '');
    const viewModel = String(sources['./model/notice-template-view-model.ts'] ?? '');
    const overlays = String(sources['./components/notice-template-overlays.tsx'] ?? '');

    expect(page).toContain("from \"./notice-template-controller\"");
    expect(page).not.toMatch(/@tanstack\/react-query|notice-template-api|useSearchParams|App\.useApp/);
    expect(page).toContain('components/notice-template-toolbar');
    expect(page).toContain('components/notice-template-results');
    expect(page).toContain('components/notice-template-overlays');
    expect(page).not.toMatch(/\b(?:Table|Drawer|Skeleton|SettingsNav)\b|templateColumns|formatTemplateTime/);
    expect(controller).not.toMatch(/@\/core\/http|apiMessage(?:Get|Post|Put|Delete)|notice-template-api/);
    expect(controller).toContain('useNoticeTemplateQueryController');
    expect(controller).toContain('useNoticeTemplateListController');
    expect(controller).toContain('useNoticeTemplateCommandController');
    expect(controller).not.toMatch(/useSearchParams|useList|provider\.(?:custom|update|deleteOne)/);
    expect(queryController).toContain('useSearchParams');
    expect(listController).toContain('useList');
    expect(commandController).toMatch(/provider\.(?:custom|update)/);
    expect(removeController).toContain('provider.deleteOne');
    expect(api).toMatch(/apiMessageGet|apiMessagePost|apiMessagePut|apiMessageDelete/);
    expect(domainModel).not.toContain('NoticeTemplateCommand');
    expect(viewModel).not.toContain('NoticeTemplateCommand');
    expect(overlays).not.toContain('NoticeTemplateCommand');
    expect(commandState).toMatch(/NoticeTemplateCommand = 'idle' \| 'loading-detail' \| 'saving' \| 'deleting'/);
    expect(page).toContain('busy={state.command !== "idle"}');
    expect(page).toContain('saving={state.command === "saving"}');
  });

  it('keeps the results table responsive without hiding source evidence', () => {
    const results = String(sources['./components/notice-template-results.tsx'] ?? '');

    expect(results).toContain('tableLayout="fixed"');
    expect(results).not.toMatch(/scroll=\{\{\s*x:/);
    expect(results).toContain("title: t('noticeTemplates.source')");
  });
});
