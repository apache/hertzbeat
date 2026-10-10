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
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { MetricCompositionControls } from './metric-composition-result';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it.each([
  ['permission', false],
  ['overloaded', true]
] as const)('renders the specific %s reason without exposing server details', (kind, retryable) => {
  render(
    <I18nextProvider i18n={i18n}>
      <MetricCompositionControls
        view={{ mode: 'chart', hidden: [] }}
        onChange={vi.fn()}
        composition={{
          plan: { version: 1, queries: [{ refId: 'a', metric: 'cpu' }], formulas: [] },
          sources: [
            { refId: 'a', state: 'error', failure: { kind, retryable, messageKey: `perses.query.${kind}` }, series: [] }
          ],
          formulas: []
        }}
      />
    </I18nextProvider>
  );
  expect(screen.getByRole('checkbox')).toHaveAccessibleName(`a · ${i18n.t(`explore.perses.${kind}`)}`);
});
