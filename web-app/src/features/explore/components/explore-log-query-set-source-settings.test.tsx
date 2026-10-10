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
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import type { LogQuerySource } from '@/platform/perses';
import { SourceSettings } from './explore-log-query-set-source-settings';

const t = ((key: string) => key) as TFunction;
const source: LogQuerySource = {
  refId: 'a',
  alias: 'a',
  visible: true,
  searchSyntax: 'structured-v1',
  search: '',
  analysis: { limit: 10, order: 'count-desc', minCount: 17 }
};
afterEach(cleanup);

it('shows measure and grouping controls inline without opening source settings', () => {
  render(<SourceSettings source={source} fields={[]} t={t} update={vi.fn()} />);

  expect(screen.getByText('explore.logAnalysis.show')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.by')).toBeVisible();
  expect(screen.queryByText('explore.logAnalysis.minCount')).not.toBeInTheDocument();
});

it('preserves an existing source minCount when an inline grouping field changes', () => {
  const update = vi.fn();
  render(
    <SourceSettings
      source={source}
      fields={[{ id: 'builtin:serviceName', source: 'builtin', key: 'serviceName', scalar: true }]}
      t={t}
      update={update}
    />
  );

  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'explore.logAnalysis.by' }));
  fireEvent.click(screen.getByRole('option', { name: 'explore.logFacets.builtin.serviceName' }));

  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      analysis: expect.objectContaining({ field: 'builtin:serviceName', minCount: 17 })
    })
  );
});
