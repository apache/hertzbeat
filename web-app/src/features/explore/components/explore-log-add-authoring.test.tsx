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

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { EditorView } from '@codemirror/view';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOG_ANALYSIS,
  validLogAnalysis,
  migrateLogQuerySet,
  addLogSource,
  addLogFormula
} from '@/platform/perses';
import { ExploreLogQuerySetAuthoring } from './explore-log-query-set-authoring';
import { ExploreLogAddAuthoring, ExploreLogAddMenu } from './explore-log-add-authoring';
import { calculatedDisabled } from './explore-log-add-menu-items';
import { defaultLogSubquery, validLogSubqueryQuery } from '../model/explore-log-subquery';

const validateCalculatedFields = vi.hoisted(() => vi.fn());
vi.mock('../api/explore-log-calculated-v2-api', () => ({ validateCalculatedFields }));

const t = ((key: string, options?: { source?: string; ref?: string }) =>
  options?.source || options?.ref ? `${key}:${options.source ?? options.ref}` : key) as TFunction;
afterEach(() => {
  cleanup();
  validateCalculatedFields.mockReset();
});

it('shares calculated field availability limits with the field menu', () => {
  const querySet = migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, 'service:api');
  expect(calculatedDisabled(querySet, undefined, undefined, true)).toBe(true);
  expect(
    calculatedDisabled(
      undefined,
      undefined,
      JSON.stringify({
        version: 2,
        nextFieldSeq: 9,
        fields: Array.from({ length: 8 }, (_, index) => ({
          id: `c${index + 1}`,
          kind: 'formula',
          name: `field${index + 1}`,
          expression: '@value + 1'
        }))
      }),
      true
    )
  ).toBe(true);
  expect(calculatedDisabled(undefined, undefined, undefined, false)).toBe(true);
});

it('adds one subquery draft and explains why structured-v2 cannot add it', () => {
  const onSubqueryChange = vi.fn();
  const { rerender } = render(
    <ExploreLogAddMenu
      raw={undefined}
      searchSyntax="structured-v1"
      t={t}
      onChange={vi.fn()}
      subqueryAvailable
      onSubqueryChange={onSubqueryChange}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logSubquery.add' }));
  expect(JSON.parse(String(onSubqueryChange.mock.calls[0]![0]))).toMatchObject({ operator: 'in', rank: { limit: 10 } });
  rerender(
    <ExploreLogAddMenu
      raw={undefined}
      searchSyntax="structured-v2"
      t={t}
      onChange={vi.fn()}
      subqueryAvailable={false}
      onSubqueryChange={onSubqueryChange}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  expect(screen.getByRole('menuitem', { name: 'explore.logSubquery.requiresStructured' })).toHaveAttribute(
    'aria-disabled',
    'true'
  );
});

it('enables subquery authoring after the final calculated field is removed from a draft', () => {
  const onSubqueryChange = vi.fn();
  const query = {
    searchSyntax: 'structured-v1',
    logAnalysis: JSON.stringify({ version: 1, representation: 'logs', limit: 20, order: 'count-desc', minCount: 1 }),
    logCalculatedV2: '',
    logCalculated: '',
    logTransactions: '',
    logAggregation: ''
  };
  render(
    <ExploreLogAddMenu
      raw={undefined}
      searchSyntax={query.searchSyntax}
      t={t}
      onChange={vi.fn()}
      subqueryAvailable={validLogSubqueryQuery({
        ...query,
        logSubquery: JSON.stringify(defaultLogSubquery())
      })}
      onSubqueryChange={onSubqueryChange}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  const item = screen.getByRole('menuitem', { name: 'explore.logSubquery.add' });
  expect(item).toHaveAttribute('aria-disabled', 'false');
  fireEvent.click(item);
  expect(onSubqueryChange).toHaveBeenCalledOnce();
});

it('validates a formula and keeps it as a draft until Query', async () => {
  validateCalculatedFields.mockResolvedValue({ valid: true });
  const query = vi.fn();
  function CalculatedSubject() {
    const [raw, setRaw] = useState<string>();
    const [syntax, setSyntax] = useState('structured-v1');
    return (
      <>
        <ExploreLogAddMenu
          raw={undefined}
          calculatedRaw={raw}
          searchSyntax={syntax}
          t={t}
          onChange={() => {}}
          onCalculatedChange={setRaw}
          onSyntaxChange={setSyntax}
          validateCalculated={validateCalculatedFields}
        />
        <output data-testid="calculated-draft">{raw}</output>
        <output data-testid="calculated-syntax">{syntax}</output>
        <button onClick={query}>Query</button>
      </>
    );
  }
  render(
    <StrictMode>
      <CalculatedSubject />
    </StrictMode>
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logCalculated.mode' }));
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.formula' }));
  const expression = EditorView.findFromDOM(
    screen.getByRole('textbox', { name: 'explore.logCalculatedV2.expression' })
  );
  expect(expression).toBeTruthy();
  act(() => expression!.dispatch({ changes: { from: 0, insert: '@duration_ms / 1000' } }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'common.confirm' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  await waitFor(() => expect(screen.getByTestId('calculated-draft').textContent).toContain('@duration_ms / 1000'));
  expect(screen.getByTestId('calculated-syntax')).toHaveTextContent('structured-v2');
  expect(query).not.toHaveBeenCalled();
});

it('does not apply a validation response after cancelling the editor', async () => {
  let resolveValidation: ((value: { valid: boolean }) => void) | undefined;
  validateCalculatedFields.mockImplementation(
    () =>
      new Promise(resolve => {
        resolveValidation = resolve;
      })
  );
  const onCalculatedChange = vi.fn();
  render(
    <ExploreLogAddMenu
      raw={undefined}
      searchSyntax="structured-v1"
      t={t}
      onChange={() => {}}
      onCalculatedChange={onCalculatedChange}
      validateCalculated={validateCalculatedFields}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logCalculated.mode' }));
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.formula' }));
  const expression = EditorView.findFromDOM(
    screen.getByRole('textbox', { name: 'explore.logCalculatedV2.expression' })
  );
  act(() => expression!.dispatch({ changes: { from: 0, insert: '@duration_ms / 1000' } }));
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  await waitFor(() => expect(validateCalculatedFields).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  await act(async () => {
    resolveValidation?.({ valid: true });
    await Promise.resolve();
  });
  expect(onCalculatedChange).not.toHaveBeenCalled();
});

function Subject({ initialRaw, onSubmit }: { initialRaw?: string; onSubmit?: () => void }) {
  const [raw, setRaw] = useState<string | undefined>(initialRaw);
  return (
    <>
      <ExploreLogAddMenu raw={raw} query="service:api" searchSyntax="structured-v1" t={t} onChange={setRaw} />
      <ExploreLogAddAuthoring raw={raw} t={t} onChange={setRaw} onSubmit={onSubmit} />
      <output data-testid="draft">{raw}</output>
    </>
  );
}

it('submits B Enter and f1 Enter from rows outside the main form', () => {
  const onSubmit = vi.fn();
  render(<Subject onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.add' }));
  const b = screen.getByRole('group', { name: 'explore.logComparison.source:b' });
  const editor = EditorView.findFromDOM(within(b).getByRole('combobox', { name: 'explore.queryLabels.logs' }));
  expect(editor).toBeTruthy();
  fireEvent.keyDown(editor!.contentDOM, { key: 'Enter', isComposing: true, keyCode: 229 });
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.keyDown(editor!.contentDOM, { key: 'Enter' });
  expect(onSubmit).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.addFormula' }));
  const formula = screen.getByRole('group', { name: 'explore.logAdd.formula:f1' });
  fireEvent.keyDown(within(formula).getByRole('textbox', { name: 'explore.logAdd.formula:f1' }), {
    key: 'Enter',
    isComposing: true,
    keyCode: 229
  });
  expect(onSubmit).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(within(formula).getByRole('textbox', { name: 'explore.logAdd.formula:f1' }), {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    charCode: 13
  });
  expect(onSubmit).toHaveBeenCalledTimes(2);
});

it('adds an independent b query and f1 formula, keeps them pending, and protects referenced b', () => {
  render(<Subject />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.add' }));
  const b = screen.getByRole('group', { name: 'explore.logComparison.source:b' });
  expect(b).toBeInTheDocument();
  expect(JSON.parse(screen.getByTestId('draft').textContent).querySet.queries).toMatchObject([
    { refId: 'a', search: 'service:api' },
    { refId: 'b', search: 'service:api' }
  ]);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.addFormula' }));
  const formula = screen.getByRole('group', { name: 'explore.logAdd.formula:f1' });
  fireEvent.change(within(formula).getByRole('textbox', { name: 'explore.logAdd.formula:f1' }), {
    target: { value: 'a / b' }
  });
  expect(within(b).getByRole('button', { name: 'explore.logAdd.removeQuery:b' })).toBeDisabled();
  expect(JSON.parse(screen.getByTestId('draft').textContent).querySet.formulas[0].expression).toBe('a / b');
  fireEvent.click(within(formula).getByRole('button', { name: 'explore.logAdd.removeFormula:f1' }));
  expect(within(b).getByRole('button', { name: 'explore.logAdd.removeQuery:b' })).toBeEnabled();
});

it('keeps independent source settings collapsible without dropping draft configuration', () => {
  render(<Subject />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.add' }));
  const b = screen.getByRole('group', { name: 'explore.logComparison.source:b' });
  const settings = b.querySelector('details');
  expect(settings).toHaveAttribute('open');
  expect(settings?.querySelector('summary')).toHaveTextContent('b · explore.logAdd.configuration');
  const before = screen.getByTestId('draft').textContent;
  settings?.removeAttribute('open');
  fireEvent(settings!, new Event('toggle'));
  expect(screen.getByTestId('draft').textContent).toBe(before);
  expect(b.querySelector('.cm-content')).toBeInTheDocument();
});

it('adds f1 to a alone without inventing b and persists independent visibility', () => {
  render(<Subject />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.addFormula' }));
  const formula = screen.getByRole('group', { name: 'explore.logAdd.formula:f1' });
  fireEvent.change(within(formula).getByRole('textbox', { name: 'explore.logAdd.formula:f1' }), {
    target: { value: 'a * 2' }
  });
  fireEvent.click(within(formula).getByRole('checkbox', { name: 'explore.logComparison.showSource:f1' }));
  const state = JSON.parse(screen.getByTestId('draft').textContent);
  expect(state).toMatchObject({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' });
  expect(state.querySet.formulas).toMatchObject([{ expression: 'a * 2', visible: false }]);
  expect(state.querySet.queries).toHaveLength(1);
  expect(screen.queryByRole('group', { name: 'explore.logComparison.source:b' })).not.toBeInTheDocument();
});

it('adds removable formula Modify functions without changing the expression and edits Power exponent', () => {
  render(<Subject />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.addFormula' }));
  const formula = screen.getByRole('group', { name: 'explore.logAdd.formula:f1' });
  fireEvent.click(within(formula).getByRole('button', { name: 'explore.logAdd.functions' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logAdd.function.abs' }));
  fireEvent.click(within(formula).getByRole('button', { name: 'explore.logAdd.functions' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logAdd.function.pow' }));
  const exponent = within(formula).getByRole('spinbutton', { name: 'explore.logAdd.powerExponent' });
  expect(exponent).toHaveValue('2');
  fireEvent.change(exponent, { target: { value: '3' } });
  const draft = JSON.parse(screen.getByTestId('draft').textContent);
  expect(draft.querySet.formulas[0]).toMatchObject({
    expression: 'a',
    functions: [{ name: 'abs' }, { name: 'pow', exponent: 3 }]
  });
  fireEvent.click(within(formula).getAllByRole('button', { name: 'explore.logAdd.removeFunction' })[0]!);
  expect(JSON.parse(screen.getByTestId('draft').textContent).querySet.formulas[0].functions).toEqual([
    { name: 'pow', exponent: 3 }
  ]);
});

it('keeps invalid formula input editable and does not erase the row', () => {
  render(<Subject />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.addFormula' }));
  const formula = screen.getByRole('group', { name: 'explore.logAdd.formula:f1' });
  fireEvent.change(within(formula).getByRole('textbox', { name: 'explore.logAdd.formula:f1' }), {
    target: { value: 'a /' }
  });
  expect(within(formula).getByRole('textbox', { name: 'explore.logAdd.formula:f1' })).toHaveAttribute(
    'aria-invalid',
    'true'
  );
  expect(JSON.parse(screen.getByTestId('draft').textContent).querySet.formulas[0].expression).toBe('a /');
  expect(validLogAnalysis(screen.getByTestId('draft').textContent)).toBe(false);
  expect(formula).toBeInTheDocument();
});

it('distinguishes formula syntax from unknown query references and clears corrected feedback', () => {
  render(<Subject />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.addFormula' }));
  const formula = within(screen.getByRole('group', { name: 'explore.logAdd.formula:f1' }));
  const input = formula.getByRole('textbox', { name: 'explore.logAdd.formula:f1' });
  fireEvent.change(input, { target: { value: 'a+' } });
  expect(formula.getByRole('alert')).toHaveTextContent('explore.logAdd.formulaSyntax');
  fireEvent.change(input, { target: { value: 'z+1' } });
  expect(formula.getByRole('alert')).toHaveTextContent('explore.logAdd.formulaUnknownReferences');
  fireEvent.change(input, { target: { value: 'a+1' } });
  expect(formula.queryByRole('alert')).not.toBeInTheDocument();
  expect(input).not.toHaveAttribute('aria-invalid');
});

it('explains incompatible grouping when a formula blocks Query', () => {
  const base = addLogFormula(addLogSource(migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, '')));
  const querySet = {
    ...base,
    queries: base.queries.map(source =>
      source.refId === 'b' ? { ...source, analysis: { ...source.analysis, field: 'builtin:serviceName' } } : source
    ),
    formulas: [{ ...base.formulas[0]!, expression: 'a / b' }]
  };
  const raw = JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet });
  render(<ExploreLogAddAuthoring raw={raw} error="invalid_log_analysis" t={t} onChange={vi.fn()} />);
  expect(screen.getByRole('alert', { name: '' })).toHaveTextContent('explore.logAdd.groupingMismatch');
});

it('reads visibility back from a history descriptor and removing f1 keeps analysis settings', () => {
  const analysis = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    order: 'measure-desc',
    measure: { function: 'sum', field: 'attribute:duration' },
    grouping: { version: 1, dimensions: [{ field: 'resource:service.name', limit: 20 }] },
    intervalMs: 60000,
    comparison: { version: 1, formula: 'a * 2', hidden: ['a'] }
  };
  render(<Subject initialRaw={JSON.stringify(analysis)} />);
  expect(screen.getByRole('checkbox', { name: 'explore.logComparison.showSource:a' })).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.removeFormula:f1' }));
  const next = JSON.parse(screen.getByTestId('draft').textContent);
  expect(next.comparison).toBeUndefined();
  expect(next.measure).toEqual(analysis.measure);
  expect(next.grouping).toEqual(analysis.grouping);
  expect(next.intervalMs).toBe(60000);
});

it('keeps a/c stable after removing b and adds d without reusing its ID', () => {
  render(<Subject />);
  const addQuery = () => {
    fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.add' }));
  };
  addQuery();
  addQuery();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.removeQuery:b' }));
  addQuery();
  expect(
    JSON.parse(screen.getByTestId('draft').textContent).querySet.queries.map(
      (source: { refId: string }) => source.refId
    )
  ).toEqual(['a', 'c', 'd']);
});

it('adds independent formulas and rejects formula references to formula rows', () => {
  render(<Subject />);
  const addFormula = () => {
    fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.add' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'explore.logComparison.addFormula' }));
  };
  addFormula();
  addFormula();
  expect(screen.getByRole('group', { name: 'explore.logAdd.formula:f2' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logAdd.formula:f2' }), { target: { value: 'f1*2' } });
  expect(validLogAnalysis(screen.getByTestId('draft').textContent)).toBe(false);
  expect(screen.getByRole('group', { name: 'explore.logAdd.formula:f2' })).toBeInTheDocument();
});

it('summarizes the selected measure field and throughput when source settings are collapsed', () => {
  const value = addLogSource(migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, 'service:api'));
  value.queries[1]!.analysis = {
    ...value.queries[1]!.analysis,
    measure: { function: 'sum', field: 'attribute:duration' },
    transform: 'throughput'
  };
  render(<ExploreLogQuerySetAuthoring value={value} raw={undefined} onChange={vi.fn()} fields={[]} t={t} />);
  const summary = screen.getByRole('group', { name: 'explore.logComparison.source:b' }).querySelector('summary');
  expect(summary).toHaveTextContent('explore.logAnalysis.sum');
  expect(summary).toHaveTextContent('duration');
  expect(summary).toHaveTextContent('explore.logAnalysis.throughput');
});
