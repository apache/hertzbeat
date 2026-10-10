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

import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { buildSavedQueryPayload } from '../model/explore-saved-query-model';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { ExploreSavedQueryEditor } from './explore-saved-query-editor';
import { ExploreSavedQueryDrawer } from './explore-saved-query-drawer';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it.each(['editor', 'directory'])(
  'describes incoming logs in the live saved %s without a historical time promise',
  surface => {
    const query = { signal: 'logs' as const, live: true, timeRange: 'last-30m' as const };
    const record = buildSavedQueryPayload(query, 'live-proof', 'Live logs', '');
    const model = {
      open: true,
      query,
      editor: { mode: 'create', label: 'Live logs', description: '', viewKey: 'live-proof' },
      groups: [{ signal: 'logs', state: 'ready', records: [record] }],
      canWrite: true,
      save: vi.fn(),
      remove: vi.fn(),
      refresh: vi.fn(),
      setOpen: vi.fn(),
      closeEditor: vi.fn()
    } as unknown as SavedQueriesViewModel;
    render(
      <I18nextProvider i18n={i18n}>
        {surface === 'editor' ? <ExploreSavedQueryEditor model={model} /> : <ExploreSavedQueryDrawer model={model} />}
      </I18nextProvider>
    );
    expect(screen.getByText(i18n.t('explore.liveFlow.incomingHint'))).toBeInTheDocument();
    expect(
      screen.queryByText(i18n.t('exploreSaved.relative', { range: i18n.t('explore.timeRanges.last-30m') }))
    ).not.toBeInTheDocument();
    expect(record.payload).toContain('"live":true');
  }
);
