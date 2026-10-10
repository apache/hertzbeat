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

import { I18nextProvider } from 'react-i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { DashboardMetricViewEditor } from './dashboard-metric-view-editor';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('updates only display draft and retains hidden rank output for split ranking', () => {
  const plan = {
    version: 1 as const,
    queries: [{ refId: 'a', metric: 'cpu' }],
    formulas: [{ id: 'f1', expression: 'a*2' }]
  };
  const view = {
    mode: 'split' as const,
    hidden: [],
    splitBy: 'host',
    splitRankBy: 'a',
    splitOrder: 'bottom' as const,
    splitScale: 'independent' as const,
    splitLimit: 3
  };
  const change = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardMetricViewEditor plan={plan} view={view} onChange={change} disabled={false} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('checkbox', { name: 'a' }));
  expect(change).toHaveBeenCalledWith({ ...view, hidden: ['a'] });
  fireEvent.change(screen.getByLabelText(i18n.t('explore.metricComposition.splitBy')), { target: { value: 'zone' } });
  expect(change).toHaveBeenLastCalledWith({ ...view, splitBy: 'zone' });
  expect(view.splitBy).toBe('host');
});
