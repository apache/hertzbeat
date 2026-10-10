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
import type { TFunction } from 'i18next';
import { afterEach, expect, it } from 'vitest';
import type { LogAnalysisResult } from '@/platform/perses';
import { ExploreLogFormulaOnlyResult } from './explore-log-formula-only-result';

afterEach(cleanup);
it('formats single-source formula values while keeping the exact value inspectable', () => {
  const data: LogAnalysisResult = {
    window: { start: 1000, end: 1801000 },
    view: 'groups',
    field: null,
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    matchingTotal: 89,
    truncated: false,
    intervalMs: null,
    groups: [{ kind: 'all', value: null, count: 89, buckets: [] }]
  };
  render(
    <ExploreLogFormulaOnlyResult
      load={{ state: 'ready', data, retry: () => {} }}
      formula="a / 1800"
      hidden={[]}
      t={((key: string) => key) as TFunction}
    />
  );
  expect(screen.getByText('explore.logAnalysis.formulaUnitHint')).toBeVisible();
  expect(
    screen.getByRole('columnheader', { name: 'explore.logAdd.formula · explore.logAnalysis.formulaUnitUnknown' })
  ).toBeVisible();
  expect(screen.getByText('0.0494444')).toHaveAttribute('title', String(89 / 1800));
});
