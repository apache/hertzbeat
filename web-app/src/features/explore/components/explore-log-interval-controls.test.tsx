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
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { ExploreLogIntervalControls, ExploreLogIntervalFailure } from './explore-log-interval-controls';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
it('stages an explicit interval and Auto without applying or discarding unrelated draft state', () => {
  const onChange = vi.fn();
  const value = { ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' as const, intervalMs: 5000 };
  const view = render(<ExploreLogIntervalControls value={value} onChange={onChange} t={t} />);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getAllByRole('option')[1]!);
  expect(onChange).toHaveBeenLastCalledWith({ ...value, intervalMs: 1000 });
  expect(screen.getAllByText('explore.logAnalysis.rollupSeconds')[0]).toBeVisible();
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('explore.logAnalysis.autoInterval'));
  expect(onChange).toHaveBeenLastCalledWith({ ...value, intervalMs: undefined });
  view.rerender(<ExploreLogIntervalControls value={{ ...value, representation: 'table' }} onChange={onChange} t={t} />);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
it('provides a context-wide Auto recovery without pretending it has applied', () => {
  const onUseAuto = vi.fn();
  render(<ExploreLogIntervalFailure onUseAuto={onUseAuto} t={t} />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.useAuto' }));
  expect(onUseAuto).toHaveBeenCalledOnce();
  expect(screen.getByText('explore.logAnalysis.intervalTooSmall')).toBeVisible();
});
