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
import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { MetricChartSettings } from './metric-chart-settings';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('validates axis drafts before applying and preserves hidden outputs', () => {
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <MetricChartSettings view={{ mode: 'chart', hidden: ['b'] }} onChange={onChange} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Display settings' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis minimum' }), { target: { value: '0' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis maximum' }), { target: { value: 'NaN' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply axis range' }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis maximum' }), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply axis range' }));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis maximum' }), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply axis range' }));
  expect(onChange).toHaveBeenLastCalledWith({ mode: 'chart', hidden: ['b'], chart: { min: 0 } });
});
