/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { logSearchText, logSearchView, setLogSearchText } from './test-log-search-editor';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import { draftFromQuery, type LogExploreSubmissionDraft } from '../model/explore-submission-model';
import { useExploreSubmission } from '../controller/use-explore-submission';
import { useLogQueryBuilder } from '../controller/use-log-query-builder';
import { ExploreQueryBar } from './explore-query-bar';
import { ExploreLogsQueryForm } from './explore-logs-forms';
import { ExploreLogsAddedSummary } from './explore-logs-search-controls';
const submit = vi.fn();
const requestField = vi.fn();
const query = {
  signal: 'logs',
  timeRange: 'last-30m',
  searchSyntax: 'structured-v1',
  query: '',
  serviceName: 'proof',
  start: 1000,
  end: 2000
} as const;
function Subject() {
  const submission = useExploreSubmission(query, submit);
  const editor = useLogQueryBuilder(submission);
  return (
    <ExploreQueryBar
      query={query}
      submission={submission}
      editor={editor}
      t={i18n.t}
      history={{ entries: [], record: vi.fn(), remove: vi.fn(), clear: vi.fn() }}
      updateQuery={vi.fn()}
      updateScope={vi.fn()}
      refresh={vi.fn()}
      time={null}
      searchSuggestions={{
        state: 'ready',
        requestField,
        options: ['@proof.kind', '@proof.name', '@proof.status'].map(value => ({
          value,
          label: value,
          fieldValue: false
        }))
      }}
    />
  );
}
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('keeps the active completion across the browser selection event and prevents native form submit', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <Subject />
      </MemoryRouter>
    </I18nextProvider>
  );
  const input = screen.getByRole<HTMLElement>('combobox', { name: i18n.t('explore.queryLabels.logs') });
  act(() => input.focus());
  setLogSearchText(input, '@proof.');
  act(() => logSearchView(input).dispatch({ selection: { anchor: 7 } }));
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  // Native selection notifications may follow key events even when the caret did not move.
  act(() => logSearchView(input).dispatch({ selection: { anchor: logSearchView(input).state.selection.main.head } }));
  const nativeDefault = fireEvent.keyDown(input, { key: 'Enter' });
  if (nativeDefault) fireEvent.submit(screen.getByRole('form', { name: i18n.t('explore.queryToolbar') }));
  expect(nativeDefault).toBe(false);
  expect(logSearchText(input)).toBe('@proof.kind:');
  expect(submit).not.toHaveBeenCalled();
});
it('starts ArrowUp at the last suggestion and wraps forward to the first', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <Subject />
      </MemoryRouter>
    </I18nextProvider>
  );
  const input = screen.getByRole<HTMLElement>('combobox', { name: i18n.t('explore.queryLabels.logs') });
  act(() => input.focus());
  setLogSearchText(input, '@proof.');
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(screen.getByRole('option', { name: '@proof.status' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { name: '@proof.kind' })).toHaveAttribute('aria-selected', 'true');
  expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false);
  expect(logSearchText(input)).toBe('@proof.kind:');
  expect(submit).not.toHaveBeenCalled();
});

it.each([
  '@codes[]:[2 TO ',
  '@codes[]:(4 ',
  '@codes[ ] : [2 TO ',
  '@users[]["codes"][]:[2 TO ',
  '@users[ ]["codes"] [ ] : (4 '
])('keeps collection text intact when completion keys are pressed: %s', text => {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <Subject />
      </MemoryRouter>
    </I18nextProvider>
  );
  const input = screen.getByRole<HTMLElement>('combobox', { name: i18n.t('explore.queryLabels.logs') });
  act(() => input.focus());
  setLogSearchText(input, text);
  act(() => logSearchView(input).dispatch({ selection: { anchor: text.length } }));
  act(() => logSearchView(input).dispatch({ selection: { anchor: logSearchView(input).state.selection.main.head } }));
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(logSearchText(input)).toBe(text);
  expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false);
  expect(logSearchText(input)).toBe(text.trimEnd());
  expect(screen.queryByRole('option', { name: '@proof.kind' })).not.toBeInTheDocument();
});

function LogsSubject() {
  const submission = useExploreSubmission(query, submit);
  const editor = useLogQueryBuilder(submission);
  return (
    <>
      <ExploreLogsQueryForm
        query={query}
        submission={submission}
        editor={editor}
        history={{ entries: [], record: vi.fn(), remove: vi.fn(), clear: vi.fn() }}
        restore={vi.fn()}
        submit={event => {
          event.preventDefault();
          submission.submit();
        }}
        refresh={vi.fn(async () => {})}
        t={i18n.t}
        searchSuggestions={undefined}
      />
      <output data-testid="comparison-draft">
        {submission.draft.signal === 'logs' ? (submission.draft.logAnalysis ?? '') : ''}
      </output>
    </>
  );
}

it('keeps the basic Logs query independent of advanced Add actions', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LogsSubject />
      </MemoryRouter>
    </I18nextProvider>
  );
  const input = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
  setLogSearchText(input, '@proof.status:500');
  expect(
    within(screen.getByRole('form', { name: i18n.t('explore.queryToolbar') })).queryByRole('button', {
      name: i18n.t('explore.logFacets.core.add')
    })
  ).toBeInTheDocument();
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByTestId('comparison-draft')).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ query: '@proof.status:500' }));
  expect(screen.getByTestId('comparison-draft')).toBeEmptyDOMElement();
});

it('keeps an existing comparison visible for contextual editing even with an incompatible legacy mode', () => {
  const onAddComparison = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogsAddedSummary
        draft={{
          ...(draftFromQuery(query) as LogExploreSubmissionDraft),
          logAggregation: 'patterns',
          logAnalysis: JSON.stringify({
            ...DEFAULT_LOG_ANALYSIS,
            representation: 'table',
            comparison: { version: 1, search: '@proof.status:500' }
          })
        }}
        t={i18n.t}
        onAddComparison={onAddComparison}
        onAddCalculated={vi.fn()}
      />
    </I18nextProvider>
  );
  expect(screen.getByText(i18n.t('explore.logComparison.source', { source: 'b' }))).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.edit') }));
  expect(onAddComparison).toHaveBeenCalledOnce();
});

it('announces a staged Logs query in the existing control row and clears it when restored', async () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LogsSubject />
      </MemoryRouter>
    </I18nextProvider>
  );
  const input = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
  const status = within(screen.getByRole('form', { name: i18n.t('explore.queryToolbar') })).getByRole('status');
  expect(status).toBeEmptyDOMElement();
  setLogSearchText(input, 'draft');
  expect(status).toHaveTextContent(i18n.t('exploreMetric.pendingDraft'));
  const details = within(status).getByRole('button', { name: i18n.t('exploreMetric.pendingDraft') });
  details.focus();
  await waitFor(() =>
    expect(
      screen
        .getAllByRole('tooltip')
        .some(tooltip => tooltip.textContent?.includes(i18n.t('exploreMetric.pendingDraft')))
    ).toBe(true)
  );
  setLogSearchText(input, '');
  expect(status).toBeEmptyDOMElement();
});
