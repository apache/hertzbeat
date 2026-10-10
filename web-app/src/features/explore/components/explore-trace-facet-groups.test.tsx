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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { draftFromQuery } from '../model/explore-submission-model';
import type { TraceExploreSubmissionDraft } from '../model/explore-submission-types';
import { TraceFacetGroups } from './explore-trace-facet-groups';
const scope = { signal: 'traces' as const, timeRange: 'last-30m' as const };
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('shows explicit group mode and all current values with separate remove and clear actions', () => {
  const onChange = vi.fn(),
    onModeChange = vi.fn();
  const draft = {
    ...draftFromQuery(scope),
    resourceFilter: 'service.name IN ("a", "b")',
    attributeFilter: 'span.name NOT IN ("GET /a")'
  } as TraceExploreSubmissionDraft;
  render(
    <I18nextProvider i18n={i18n}>
      <TraceFacetGroups
        draft={draft}
        scope={scope}
        field="serviceName"
        mode="include"
        onModeChange={onModeChange}
        onChange={onChange}
        enabled
      />
    </I18nextProvider>
  );
  expect(screen.getByRole('combobox', { name: 'Facet match mode' })).toBeEnabled();
  expect(screen.getByText('a')).toBeVisible();
  expect(screen.getByText('b')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Service value a' }));
  expect(onChange).toHaveBeenLastCalledWith({ field: 'resourceFilter', value: 'service.name IN ("b")' });
  fireEvent.click(screen.getByRole('button', { name: 'Clear Operation group' }));
  expect(onChange).toHaveBeenLastCalledWith({ field: 'attributeFilter', value: '' });
  expect(screen.getByText(/Missing values remain included/)).toBeVisible();
  const semantics = screen.getByText('Filter semantics').closest('details')!;
  expect(semantics).not.toHaveAttribute('open');
  semantics.setAttribute('open', '');
  expect(screen.getByText(/Other spans in the same trace can still match/)).toBeVisible();
  expect(screen.getByText('Filters change the draft; run Query to apply.')).toBeVisible();
});
it('explains protected raw and fixed scope instead of silently clearing them', () => {
  const onChange = vi.fn(),
    d = { ...draftFromQuery(scope), resourceFilter: 'service.name=a OR service.name=b' } as TraceExploreSubmissionDraft;
  const props = {
    draft: d,
    scope,
    field: 'serviceName' as const,
    mode: 'include' as const,
    onModeChange: vi.fn(),
    onChange,
    enabled: true
  };
  const r = render(
    <I18nextProvider i18n={i18n}>
      <TraceFacetGroups {...props} />
    </I18nextProvider>
  );
  expect(screen.getByRole('combobox', { name: 'Facet match mode' })).toBeDisabled();
  expect(screen.getByText(/Advanced filter is preserved/)).toBeVisible();
  r.rerender(
    <I18nextProvider i18n={i18n}>
      <TraceFacetGroups {...props} scope={{ ...scope, serviceName: 'fixed' }} />
    </I18nextProvider>
  );
  expect(screen.getByText(/Fixed context is preserved/)).toBeVisible();
  expect(onChange).not.toHaveBeenCalled();
});
