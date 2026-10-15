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
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { TraceExploreSubmissionDraft } from '../model/explore-submission-model';
import { EMPTY_TRACE_STRUCTURE_DRAFT } from '../model/explore-trace-structure';
import { ExploreTraceStructureEditor } from './explore-trace-structure-editor';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

const draft: TraceExploreSubmissionDraft = {
  signal: 'traces',
  traceStructure: JSON.stringify(EMPTY_TRACE_STRUCTURE_DRAFT),
  sort: 'newest',
  serviceName: '',
  serviceNamespace: '',
  environment: '',
  instance: '',
  endpoint: '',
  query: '',
  traceId: '',
  resourceFilter: '',
  attributeFilter: '',
  minDurationMs: '',
  maxDurationMs: '',
  errorOnly: false,
  spanScope: '',
  hideInternal: false
};

it('keeps clause editing in the draft until Query and reports conflicting filters', () => {
  const updateField = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreTraceStructureEditor
        draft={{ ...draft, serviceName: 'outer' }}
        errors={{}}
        t={i18n.t}
        updateField={updateField}
      />
    </I18nextProvider>
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'A Service name' }), { target: { value: 'checkout' } });
  const firstUpdate: unknown = updateField.mock.calls[0]?.[0];
  expect(firstUpdate).toMatchObject({ field: 'traceStructure', value: expect.any(String) });
  if (
    !firstUpdate ||
    typeof firstUpdate !== 'object' ||
    !('value' in firstUpdate) ||
    typeof firstUpdate.value !== 'string'
  )
    throw new Error('Expected structure draft update');
  expect(JSON.parse(firstUpdate.value)).toMatchObject({ a: { serviceName: 'checkout' } });
  expect(screen.getByRole('alert')).toHaveTextContent('Clear the current span filters');
  fireEvent.click(screen.getByRole('button', { name: 'Clear span filters' }));
  expect(updateField).toHaveBeenCalledWith({ field: 'serviceName', value: '' });
});

it('makes corrupt saved structure visible instead of silently replacing it', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreTraceStructureEditor
        draft={{ ...draft, traceStructure: '{' }}
        errors={{}}
        t={i18n.t}
        updateField={vi.fn()}
      />
    </I18nextProvider>
  );
  expect(screen.getByRole('alert')).toHaveTextContent('invalid');
});
