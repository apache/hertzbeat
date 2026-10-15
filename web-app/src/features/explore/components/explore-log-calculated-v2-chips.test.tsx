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

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { ExploreLogCalculatedV2Chips } from './explore-log-calculated-v2-chips';
import { parseLogAnalysis } from '@/platform/perses';

afterEach(cleanup);
const t = ((key: string) => key) as TFunction;
const raw = JSON.stringify({
  version: 2,
  nextFieldSeq: 2,
  fields: [{ id: 'c1', kind: 'formula', name: 'durationSeconds', expression: '@duration_ms / 1000' }]
});
function subject(query = 'service:api', validate = vi.fn(), calculatedRaw = raw) {
  const updateField = vi.fn();
  const submit = vi.fn();
  const submission = {
    draft: { signal: 'logs', query, logCalculatedV2: calculatedRaw },
    updateField,
    submit
  } as unknown as ExploreSubmissionViewModel;
  render(<ExploreLogCalculatedV2Chips submission={submission} t={t} validate={validate} />);
  return { updateField, submit, validate };
}

it('opens an existing extraction output in the extraction editor', async () => {
  const extraction = JSON.stringify({
    version: 2,
    nextFieldSeq: 2,
    fields: [
      {
        id: 'c1',
        kind: 'extraction',
        engine: 'regex',
        source: 'builtin:body',
        pattern: '(?<token>GET)',
        captures: [{ name: 'token' }]
      }
    ]
  });
  const validate = vi.fn().mockResolvedValue({ valid: true });
  const { updateField, submit } = subject('service:api', validate, extraction);
  fireEvent.click(screen.getByRole('button', { name: '#token' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'common.edit' }));
  expect(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' })).toHaveValue('(?<token>GET)');
  expect(screen.queryByRole('textbox', { name: 'explore.logCalculatedV2.captures' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'common.confirm' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  expect(updateField).not.toHaveBeenCalled();
  expect(validate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '#token' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'common.edit' }));
  const pattern = screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' });
  expect(pattern).toHaveValue('(?<token>GET)');
  fireEvent.change(pattern, { target: { value: '(?<method>POST)' } });
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  await waitFor(() => expect(updateField).toHaveBeenCalledOnce());
  const update = updateField.mock.calls[0]![0] as { field: string; value: string };
  const next = JSON.parse(update.value);
  expect(update.field).toBe('logCalculatedV2');
  expect(next).toEqual({
    version: 2,
    nextFieldSeq: 2,
    fields: [
      {
        id: 'c1',
        kind: 'extraction',
        engine: 'regex',
        source: 'builtin:body',
        pattern: '(?<method>POST)',
        captures: [{ name: 'method' }]
      }
    ]
  });
  expect(validate).toHaveBeenCalledWith(JSON.stringify(next), undefined, expect.any(AbortSignal));
  expect(submit).not.toHaveBeenCalled();
});

it('filters through the single query bar and runs Query', async () => {
  const { updateField, submit } = subject();
  fireEvent.click(screen.getByRole('button', { name: '#durationSeconds' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'explore.logCalculatedV2.filterBy' }));
  expect(updateField).toHaveBeenCalledWith({ field: 'query', value: 'service:api AND #durationSeconds:*' });
  expect(submit).toHaveBeenCalledOnce();
});

it('groups a calculated output in Timeseries without changing search or definitions', async () => {
  const { updateField, submit } = subject('service:api OR #durationSeconds:>=1');
  fireEvent.click(screen.getByRole('button', { name: '#durationSeconds' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'explore.logCalculatedV2.groupBy' }));
  expect(updateField).toHaveBeenCalledOnce();
  const update = updateField.mock.calls[0]?.[0] as { field: string; value: string };
  expect(update.field).toBe('logAnalysis');
  expect(parseLogAnalysis(update.value)).toMatchObject({
    representation: 'timeseries',
    field: 'calculated:durationSeconds',
    limit: 20
  });
  expect(submit).toHaveBeenCalledOnce();
});

it('groups an existing OR expression before adding the calculated existence clause', async () => {
  const { updateField, submit } = subject('service:api OR service:worker');
  fireEvent.click(screen.getByRole('button', { name: '#durationSeconds' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'explore.logCalculatedV2.filterBy' }));
  expect(updateField).toHaveBeenCalledWith({
    field: 'query',
    value: '(service:api OR service:worker) AND #durationSeconds:*'
  });
  expect(submit).toHaveBeenCalledOnce();
});

it('protects a referenced field and restores structured v1 after the last unreferenced removal', () => {
  const referenced = subject('#durationSeconds:*');
  fireEvent.click(screen.getByLabelText('Close'));
  expect(screen.getByRole('alert')).toHaveTextContent('explore.logCalculatedV2.dependency');
  expect(referenced.updateField).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '#durationSeconds' })).toBeVisible();
  cleanup();
  const unreferenced = subject();
  expect(screen.getByText('explore.logCalculatedV2.fields')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Close'));
  expect(unreferenced.updateField).toHaveBeenCalledWith({ field: 'logCalculatedV2', value: undefined });
  expect(unreferenced.updateField).toHaveBeenCalledWith({ field: 'searchSyntax', value: 'structured-v1' });
  expect(unreferenced.submit).not.toHaveBeenCalled();
});

it('opens the field menu from the tag label while the close control removes directly', async () => {
  const { updateField } = subject();
  fireEvent.click(screen.getByRole('button', { name: '#durationSeconds' }));
  expect(await screen.findByRole('menuitem', { name: 'explore.logCalculatedV2.filterBy' })).toBeInTheDocument();
  expect(updateField).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Close'));
  expect(updateField).toHaveBeenCalledWith({ field: 'logCalculatedV2', value: undefined });
});

it('offers a keyboard reachable delete action in the tag menu', async () => {
  const { updateField } = subject();
  fireEvent.click(screen.getByRole('button', { name: '#durationSeconds' }));
  const menu = await screen.findByRole('menu');
  await waitFor(() => expect(menu).toContainElement(document.activeElement as HTMLElement | null));
  fireEvent.click(screen.getByRole('menuitem', { name: 'common.delete' }));
  expect(updateField).toHaveBeenCalledWith({ field: 'logCalculatedV2', value: undefined });
});

it('cancels an edit without changing the draft', async () => {
  const { updateField } = subject();
  fireEvent.click(screen.getByRole('button', { name: '#durationSeconds' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'common.edit' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'explore.logCalculated.name' }), {
    target: { value: 'renamedSeconds' }
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(updateField).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '#durationSeconds' })).toBeInTheDocument();
});

it('keeps the applied draft after invalid validation and can retry the edit', async () => {
  const validate = vi.fn().mockResolvedValueOnce({ valid: false }).mockResolvedValueOnce({ valid: true });
  const { updateField, submit } = subject('service:api', validate);
  fireEvent.click(screen.getByRole('button', { name: '#durationSeconds' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'common.edit' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'explore.logCalculated.name' }), {
    target: { value: 'renamedSeconds' }
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'common.confirm' }));
  await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('explore.logCalculatedV2.invalid'));
  expect(updateField).not.toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();
  const confirm = within(dialog).getByText('common.confirm').closest('button');
  expect(confirm).not.toBeNull();
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm!);
  await waitFor(() =>
    expect(updateField).toHaveBeenCalledWith({
      field: 'logCalculatedV2',
      value: expect.stringContaining('renamedSeconds')
    })
  );
  expect(submit).not.toHaveBeenCalled();
});
