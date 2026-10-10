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
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import { ExploreLogAuthoringRepresentation } from './explore-log-authoring-representation';

afterEach(cleanup);
const t = ((key: string) => key) as TFunction;
const current = { ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' as const };
const fields = [{ id: 'builtin:serviceName', source: 'builtin' as const, key: 'serviceName' }];
function setup(pending = false) {
  const apply = vi.fn(() => true);
  render(
    <ExploreLogAuthoringRepresentation
      current={current}
      raw={JSON.stringify(current)}
      draftRaw={pending ? JSON.stringify({ ...current, limit: 5 }) : JSON.stringify(current)}
      fields={fields}
      onRepresentationChange={vi.fn()}
      onSettingsApply={apply}
      t={t}
    />
  );
  return apply;
}
it('keeps timeseries controls in settings without inserting an authoring row', () => {
  setup();
  expect(screen.queryByRole('combobox', { name: 'explore.logAnalysis.by' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.label' }));
  expect(screen.getByRole('combobox', { name: 'explore.logAnalysis.by' })).toBeInTheDocument();
});
it('keeps a pending analysis draft out of the inline authoring area', () => {
  setup(true);
  expect(screen.queryByRole('combobox', { name: 'explore.logAnalysis.by' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('explore.logAnalysis.pending');
});
it('keeps aggregation controls out of the raw log list', () => {
  render(
    <ExploreLogAuthoringRepresentation
      current={DEFAULT_LOG_ANALYSIS}
      raw={undefined}
      draftRaw={undefined}
      fields={fields}
      onRepresentationChange={vi.fn()}
      onSettingsApply={vi.fn()}
      t={t}
    />
  );
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.label' })).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'explore.logAnalysis.by' })).not.toBeInTheDocument();
});

it('preserves unsupported legacy table measures until an explicit settings reset is confirmed', () => {
  const legacy = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'table' as const,
    additionalMeasures: [{ function: 'avg' as const, field: 'attribute:duration' }]
  };
  const raw = JSON.stringify(legacy);
  const apply = vi.fn(() => true);
  render(
    <ExploreLogAuthoringRepresentation
      current={legacy}
      raw={raw}
      draftRaw={raw}
      fields={fields}
      onRepresentationChange={vi.fn()}
      onSettingsApply={apply}
      t={t}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent('explore.logAnalysis.legacyUnsupported');
  expect(screen.getByRole('button', { name: 'explore.logAnalysis.logs' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'explore.logAnalysis.timeseries' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.table' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.label' }));
  expect(screen.getByRole('button', { name: 'common.confirm' })).toBeDisabled();
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.reset' }));
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  expect(apply).toHaveBeenCalledWith(DEFAULT_LOG_ANALYSIS);
});
