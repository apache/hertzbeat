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
    const page = source('./notice-template-page.tsx');
    const controller = source('./notice-template-controller.ts');
    const queryController = source('./controller/use-notice-template-query-controller.ts');
    const listController = source('./controller/use-notice-template-list-controller.ts');
    const commandController = source('./controller/use-notice-template-command-controller.ts');
    const commandState = source('./controller/notice-template-command-state.ts');
    const editorController = source('./controller/use-notice-template-editor-controller.ts');
    const operationController = source('./controller/use-notice-template-operation-controller.ts');
    const removeController = source('./controller/use-notice-template-remove.ts');
    const submitController = source('./controller/use-notice-template-submit.ts');
    const api = source('./notice-template-api.ts');
    const domainModel = source('./notice-template-model.ts');
    const viewModel = source('./model/notice-template-view-model.ts');
    const overlays = source('./components/notice-template-overlays.tsx');

    expect(page).toContain('from "./notice-template-controller"');
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
    expect(commandController).toContain('useNoticeTemplateOperationController');
    expect(commandController).toContain('useNoticeTemplateEditorController');
    expect(commandController).toContain('useNoticeTemplateSubmit');
    expect(editorController).toContain('pendingRef');
    expect(editorController).toContain('operation.isCurrent');
    expect(operationController).toMatch(/ownerRef|epochRef/);
    expect(submitController).toMatch(/provider\.(?:custom|update)/);
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

function source(path: string) {
  return String(sources[path] ?? '');
}
