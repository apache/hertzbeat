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

import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { useExplorePageController } from './use-explore-page-controller';
import { draftFromQuery } from '../model/explore-submission-model';
import { useLogInspectorAnalysis } from './use-log-inspector-analysis';

it('reports an invalid pending draft without changing analysis or closing the inspector', () => {
  const query = { signal: 'logs' as const, timeRange: 'last-30m' as const };
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') throw new Error('Expected log draft');
  draft.logNumericRange = '{';
  const submit = vi.fn();
  const updateField = vi.fn();
  const controller = {
    query,
    result: { kind: 'ready' },
    submission: { draft, submit, updateField }
  } as unknown as ReturnType<typeof useExplorePageController>;
  const { result } = renderHook(() => useLogInspectorAnalysis(controller, true));
  expect(
    result.current.controls.onAnalyzeLogField?.(
      {
        field: { source: 'attribute', key: 'status', id: 'attribute:status' },
        numeric: false
      },
      'graph'
    )
  ).toBe(false);
  expect(submit).toHaveBeenCalledOnce();
  expect(updateField).not.toHaveBeenCalled();
});
