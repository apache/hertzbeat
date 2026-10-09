/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { EditorView } from '@codemirror/view';
import { Transaction } from '@codemirror/state';
import { undo } from '@codemirror/commands';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { TFunction } from 'i18next';
import { ExploreLogSearchInput } from './explore-log-search-input';
import { ExploreInvalidLogFilter } from './explore-invalid-log-filter';
import type { RecentLogSearch } from '../model/explore-recent-log-searches';
import { draftFromQuery } from '../model/explore-submission-model';
beforeAll(async () => {
  Range.prototype.getClientRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: () => [][Symbol.iterator]()
  });
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
const submit = vi.fn();
const requestField = vi.fn();
beforeEach(() => {
  submit.mockClear();
  requestField.mockClear();
});
function Subject({
  mode = 'structured-v1',
  initial = 'service:che AND status:ERROR',
  suggestedService,
  recentQueries,
  restoreRecentQuery,
  blurSubmit = false,
  translate = i18n.t.bind(i18n)
}: {
  mode?: string;
  initial?: string;
  suggestedService?: string;
  recentQueries?: RecentLogSearch[];
  restoreRecentQuery?: (entry: RecentLogSearch) => void;
  blurSubmit?: boolean;
  translate?: TFunction;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div data-explore-query-layout="split">
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <div data-log-command-fields>
          <ExploreLogSearchInput
            value={value}
            syntax={mode}
            onChange={setValue}
            onBlurSubmit={blurSubmit}
            t={translate}
            suggestedService={suggestedService}
            recentQueries={recentQueries}
            restoreRecentQuery={restoreRecentQuery}
            suggestions={{
              state: 'ready',
              field: initial === 'sta' ? undefined : 'service',
              options:
                initial === 'sta'
                  ? [
                      {
                        value: 'INFO',
                        label: 'INFO',
                        condition: 'status:"INFO"',
                        insertion: 'status:"INFO"',
                        count: 2,
                        fieldValue: true
                      }
                    ]
                  : [
                      {
                        value: 'checkout',
                        label: 'checkout',
                        condition: 'service:"checkout"',
                        count: 3,
                        fieldValue: true
                      }
                    ],
              requestField
            }}
          />
          <button type="button">Add</button>
        </div>
      </form>
      <button type="button" onClick={() => setValue('service:che')}>
        External query
      </button>
      <ExploreInvalidLogFilter />
    </div>
  );
}
function editor() {
  const content = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
  const view = EditorView.findFromDOM(content);
  if (!view) throw new Error('CodeMirror editor missing');
  return view;
}
it('submits a complete pending search when focus leaves the command fields', () => {
  submit.mockClear();
  render(<Subject blurSubmit />);
  const view = editor();
  view.focus();
  fireEvent.blur(view.contentDOM, { relatedTarget: screen.getByRole('button', { name: 'External query' }) });
  expect(submit).toHaveBeenCalledTimes(1);
  view.dispatch({ changes: { from: view.state.doc.length, insert: ' OR status:WARN' } });
  fireEvent.blur(view.contentDOM, { relatedTarget: screen.getByRole('button', { name: 'External query' }) });
  expect(submit).toHaveBeenCalledTimes(2);
});

it('does not submit incomplete searches or when focus moves to an in-scope action', () => {
  submit.mockClear();
  const page = render(<Subject blurSubmit initial="service:" />);
  let view = editor();
  view.focus();
  fireEvent.blur(view.contentDOM, { relatedTarget: screen.getByRole('button', { name: 'External query' }) });
  expect(submit).not.toHaveBeenCalled();

  page.rerender(<Subject blurSubmit />);
  view = editor();
  view.focus();
  fireEvent.blur(view.contentDOM, { relatedTarget: screen.getByRole('button', { name: 'Add' }) });
  expect(submit).not.toHaveBeenCalled();
});

it('does not submit the same query again when Enter is followed by blur', () => {
  submit.mockClear();
  render(<Subject blurSubmit />);
  const view = editor();
  fireEvent.keyDown(view.contentDOM, { key: 'Enter' });
  expect(submit).toHaveBeenCalledTimes(1);
  fireEvent.blur(view.contentDOM, { relatedTarget: screen.getByRole('button', { name: 'External query' }) });
  expect(submit).toHaveBeenCalledTimes(1);
});

it('does not submit while an IME composition is active', () => {
  submit.mockClear();
  render(<Subject blurSubmit />);
  const view = editor();
  fireEvent.compositionStart(view.contentDOM);
  fireEvent.blur(view.contentDOM, { relatedTarget: screen.getByRole('button', { name: 'External query' }) });
  expect(submit).not.toHaveBeenCalled();
});
it('does not submit when keyboard focus moves into recent-search or help popovers', async () => {
  submit.mockClear();
  const recentDraft = draftFromQuery({ signal: 'logs', timeRange: 'last-30m', query: 'service:api' });
  if (recentDraft.signal !== 'logs') throw new Error('Expected a logs search');
  const recent = {
    ...recentDraft,
    executedAt: 1
  };
  render(<Subject blurSubmit recentQueries={[recent]} />);
  const view = editor();
  view.focus();
  const recentOption = await screen.findByRole('button', { name: 'service:api' });
  fireEvent.blur(view.contentDOM, { relatedTarget: recentOption });
  expect(submit).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logAuthoring.help') }));
  const help = screen.getByRole('region', { name: i18n.t('explore.logAuthoring.help') });
  fireEvent.blur(view.contentDOM, { relatedTarget: help });
  expect(submit).not.toHaveBeenCalled();
});
it('keeps completion as an editable document change without submitting', async () => {
  submit.mockClear();
  render(<Subject />);
  const view = editor();
  expect(view.contentDOM.querySelector('.hb-log-query-token')).toHaveTextContent('service:che');
  view.focus();
  act(() => view.dispatch({ selection: { anchor: 11 } }));
  await waitFor(() => expect(requestField).toHaveBeenCalledWith('service'));
  fireEvent.keyDown(view.contentDOM, { key: 'ArrowDown' });
  await waitFor(() => expect(view.contentDOM).toHaveAttribute('aria-activedescendant'));
  fireEvent.keyDown(view.contentDOM, { key: 'Enter' });
  expect(view.state.doc.toString()).toBe('service:"checkout" AND status:ERROR');
  expect(submit).not.toHaveBeenCalled();
  expect(view.state.selection.main.head).toBe(18);
  view.dispatch({ changes: { from: 17, to: 18, insert: 'u' } });
  expect(view.state.doc.toString()).toBe('service:"checkoutu AND status:ERROR');
  expect(undo(view)).toBe(true);
  expect(view.state.doc.toString()).toBe('service:"checkout" AND status:ERROR');
  fireEvent.keyDown(view.contentDOM, { key: 'Escape' });
  await waitFor(() => expect(view.contentDOM).toHaveAttribute('aria-expanded', 'false'));
});
it('keeps structured token editing and completion in v2', async () => {
  render(<Subject mode="structured-v2" initial="service:che AND #durationSeconds:10.23" />);
  const view = editor();
  expect(view.contentDOM.querySelector('.hb-log-query-token')).toHaveTextContent('service:che');
  expect(view.contentDOM).toHaveTextContent('#durationSeconds:10.23');
  expect(screen.queryByText(i18n.t('explore.logAuthoring.unsupportedMode'))).toBeNull();
  view.focus();
  act(() => view.dispatch({ selection: { anchor: 11 } }));
  await waitFor(() => expect(requestField).toHaveBeenCalledWith('service'));
});
it('keeps a calculated numeric comparison as one removable chip in v2', () => {
  render(<Subject mode="structured-v2" initial="#durationSeconds:>=10.23 AND service:api" />);
  const chips = Array.from(editor().contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent);
  expect(chips).toContain('#durationSeconds:>=10.23');
});
it('keeps literal mode plain and focuses structured editor from correction', () => {
  const view = render(<Subject mode="" />);
  expect(editor().contentDOM).toHaveAttribute('aria-expanded', 'false');
  view.unmount();
  render(<Subject />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logQueryBuilder.checkFilter' }));
  expect(editor().contentDOM).toHaveFocus();
});

it('reconfigures token display without replacing the document, and literal Enter submits', () => {
  const page = render(<Subject mode="" />);
  const view = editor();
  expect(view.contentDOM.querySelector('.hb-log-query-token')).toBeNull();
  fireEvent.keyDown(view.contentDOM, { key: 'Enter' });
  expect(submit).toHaveBeenCalled();
  page.rerender(<Subject mode="structured-v1" />);
  expect(EditorView.findFromDOM(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }))).toBe(view);
  expect(view.state.doc.toString()).toBe('service:che AND status:ERROR');
  expect(view.contentDOM.querySelector('.hb-log-query-token')).toHaveTextContent('service:che');
});

it('shows structured words, phrases, wildcards, and fields as editable labels', () => {
  render(<Subject initial={'codex AND "request failed" OR *:codex* -@event.name:"api request"'} />);
  const view = editor();
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    'codex',
    '"request failed"',
    '*:codex*',
    '-@event.name:"api request"'
  ]);
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-field'), node => node.textContent)).toEqual([
    '*:',
    '-@event.name:'
  ]);
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-punctuation'), node => node.textContent)).toEqual([
    ':',
    ':'
  ]);
  expect(view.state.doc.toString()).toBe('codex AND "request failed" OR *:codex* -@event.name:"api request"');
});

it('keeps field groups together and decorates logical and status tokens semantically', () => {
  render(<Subject initial="service:(api OR worker) AND status:ERROR OR status:WARN status:INFO" />);
  const content = editor().contentDOM;
  expect(Array.from(content.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    'service:(api OR worker)',
    'status:ERROR',
    'status:WARN',
    'status:INFO'
  ]);
  expect(content.querySelectorAll('.hb-log-query-group')).toHaveLength(1);
  expect(content.querySelectorAll('.hb-log-query-operator')).toHaveLength(3);
  expect(content.querySelector('.hb-log-query-status-error')).toHaveTextContent('status:ERROR');
  expect(content.querySelector('.hb-log-query-status-warn')).toHaveTextContent('status:WARN');
  expect(content.querySelector('.hb-log-query-status-info')).toHaveTextContent('status:INFO');
  fireEvent.click(content.querySelectorAll('.hb-log-query-operator')[0]!);
  expect(content.querySelectorAll('.hb-log-query-operator')).toHaveLength(2);
  expect(content.querySelector('.hb-log-query-group')).toBeNull();
  fireEvent.blur(content);
  expect(content.querySelectorAll('.hb-log-query-operator')).toHaveLength(3);
  expect(content.querySelector('.hb-log-query-group')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: service:(api OR worker)` })
  );
  expect(editor().state.doc.toString()).toBe('status:ERROR OR status:WARN status:INFO');
  expect(undo(editor())).toBe(true);
  expect(editor().state.doc.toString()).toBe('service:(api OR worker) AND status:ERROR OR status:WARN status:INFO');
});

it('colors quoted and supported status severities and leaves literal or unfinished OR plain', () => {
  render(
    <Subject
      initial={
        'status:"INFO" status:"WARN" status:"TRACE" status:DEBUG status:FATAL status:WARNING service:(OR) service:(api OR'
      }
    />
  );
  const content = editor().contentDOM;
  expect(content.querySelectorAll('.hb-log-query-status-info')).toHaveLength(1);
  expect(content.querySelectorAll('.hb-log-query-status-warn')).toHaveLength(2);
  expect(content.querySelector('.hb-log-query-status-trace')).toHaveTextContent('status:"TRACE"');
  expect(content.querySelector('.hb-log-query-status-debug')).toHaveTextContent('status:DEBUG');
  expect(content.querySelector('.hb-log-query-status-fatal')).toHaveTextContent('status:FATAL');
  expect(content.querySelectorAll('.hb-log-query-operator')).toHaveLength(0);
});

it('starts a separate draft when typing at the end of a committed label', () => {
  render(<Subject initial="codex" />);
  const view = editor();
  view.focus();
  act(() => view.dispatch({ selection: { anchor: 5 } }));
  const handled = view.state
    .facet(EditorView.inputHandler)
    .some(handler => handler(view, 5, 5, 'f', () => view.state.update({ changes: { from: 5, insert: 'f' } })));
  expect(handled).toBe(true);
  expect(view.state.doc.toString()).toBe('codex f');
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    'codex'
  ]);
  act(() =>
    view.dispatch({
      changes: { from: 7, insert: 'oo' },
      selection: { anchor: 9 },
      annotations: Transaction.userEvent.of('input.type')
    })
  );
  expect(view.contentDOM.querySelectorAll('.hb-log-query-token')).toHaveLength(1);
  act(() => view.dispatch({ changes: { from: 9, insert: ' ' }, selection: { anchor: 10 } }));
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    'codex',
    'foo'
  ]);
});

it('commits a quoted draft on blur and edits an old label only after entering it', () => {
  render(<Subject initial="codex " />);
  const view = editor();
  view.focus();
  act(() => view.dispatch({ changes: { from: 6, insert: '"request failed"' }, selection: { anchor: 22 } }));
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    'codex'
  ]);
  fireEvent.blur(view.contentDOM);
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    'codex',
    '"request failed"'
  ]);
  act(() => view.dispatch({ selection: { anchor: 3 } }));
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    '"request failed"'
  ]);
});

it('separates pasted text after a committed label and keeps it as a draft', () => {
  render(<Subject initial="codex" />);
  const view = editor();
  act(() => view.dispatch({ selection: { anchor: 5 } }));
  const filtered = view.state
    .facet(EditorView.clipboardInputFilter)
    .reduce((text, filter) => filter(text, view.state), 'probe');
  expect(filtered).toBe(' probe');
  act(() =>
    view.dispatch({ changes: { from: 5, insert: filtered }, selection: { anchor: 11 }, userEvent: 'input.paste' })
  );
  expect(view.state.doc.toString()).toBe('codex probe');
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    'codex'
  ]);
});

it('does not prepend a separator when paste replaces a selected token suffix', () => {
  render(<Subject initial="codex" />);
  const view = editor();
  act(() => view.dispatch({ selection: { anchor: 2, head: 5 } }));
  const filtered = view.state
    .facet(EditorView.clipboardInputFilter)
    .reduce((text, filter) => filter(text, view.state), 'bar');
  expect(filtered).toBe('bar');
});

it('opens a separate draft before composition starts at a committed label boundary', () => {
  render(<Subject initial="codex" />);
  const view = editor();
  view.focus();
  act(() => view.dispatch({ selection: { anchor: 5 } }));
  fireEvent.compositionStart(view.contentDOM);
  expect(view.state.doc.toString()).toBe('codex ');
  act(() => view.dispatch({ changes: { from: 6, insert: 'a' }, selection: { anchor: 7 } }));
  expect(view.state.doc.toString()).toBe('codex a');
});

it('keeps an old label editable when clicked on its text', () => {
  render(<Subject initial="codex AND status:ERROR" />);
  const view = editor();
  const label = view.contentDOM.querySelector('.hb-log-query-token');
  if (!label) throw new Error('Token label missing');
  fireEvent.click(label);
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    'status:ERROR'
  ]);
});

it('keeps a clicked label editable when Backspace follows at the same caret', () => {
  render(<Subject initial="codex" />);
  const view = editor();
  view.focus();
  act(() => view.dispatch({ selection: { anchor: 5 } }));
  const label = view.contentDOM.querySelector('.hb-log-query-token');
  if (!label) throw new Error('Token label missing');
  fireEvent.click(label);
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('code');
});

it('does not commit an active label on an IME confirmation Enter', () => {
  render(<Subject initial="codex" />);
  const view = editor();
  const label = view.contentDOM.querySelector('.hb-log-query-token');
  if (!label) throw new Error('Token label missing');
  fireEvent.click(label);
  expect(view.contentDOM.querySelector('.hb-log-query-token')).toBeNull();
  submit.mockClear();
  fireEvent.keyDown(view.contentDOM, { key: 'Enter', isComposing: true, keyCode: 229 });
  expect(view.contentDOM.querySelector('.hb-log-query-token')).toBeNull();
  expect(submit).not.toHaveBeenCalled();
  fireEvent.keyDown(view.contentDOM, { key: 'Enter', keyCode: 229 });
  expect(view.contentDOM.querySelector('.hb-log-query-token')).toBeNull();
  expect(submit).not.toHaveBeenCalled();
});

it('keeps escaped terms intact and leaves operators or unfinished quotes undecorated', () => {
  render(<Subject initial={'AND OR NOT ( service:foo\\ bar "say \\"hi\\""'} />);
  const view = editor();
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    'service:foo\\ bar',
    '"say \\"hi\\""'
  ]);
  act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'NOT service:"unfinished' } }));
  expect(view.contentDOM.querySelector('.hb-log-query-token')).toBeNull();
  expect(view.state.doc.toString()).toBe('NOT service:"unfinished');
});

it('keeps collection paths and numeric ranges in one editable label', () => {
  render(<Subject initial={'@users[]["name"][]:"Peter" AND status:[1 TO 3] service:"ok"tail'} />);
  const view = editor();
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-token'), node => node.textContent)).toEqual([
    '@users[]["name"][]:"Peter"',
    'status:[1 TO 3]',
    'service:"ok"',
    'tail'
  ]);
  expect(Array.from(view.contentDOM.querySelectorAll('.hb-log-query-field'), node => node.textContent)).toEqual([
    '@users[]["name"][]:',
    'status:',
    'service:'
  ]);
  expect(view.state.doc.toString()).toBe('@users[]["name"][]:"Peter" AND status:[1 TO 3] service:"ok"tail');
});

it('removes a complete token from its trailing boundary and restores it with undo', () => {
  render(<Subject initial="codex AND service:checkout" />);
  const view = editor();
  view.focus();
  act(() => view.dispatch({ selection: { anchor: 5 } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('service:checkout');
  expect(undo(view)).toBe(true);
  expect(view.state.doc.toString()).toBe('codex AND service:checkout');
  act(() => view.dispatch({ selection: { anchor: 4 } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('codx AND service:checkout');
});

it('removes adjacent logical connectors with a token and restores the complete expression with undo', () => {
  render(<Subject initial="service:a AND status:b" />);
  const view = editor();
  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: status:b` }));
  expect(view.state.doc.toString()).toBe('service:a ');
  expect(undo(view)).toBe(true);
  expect(view.state.doc.toString()).toBe('service:a AND status:b');

  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: service:a` }));
  expect(view.state.doc.toString()).toBe('status:b');
});

it('removes middle OR terms using the right connector and cleans an emptied nested group', () => {
  render(<Subject initial="service:a OR status:b OR host:c" />);
  const view = editor();
  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: status:b` }));
  expect(view.state.doc.toString()).toBe('service:a OR host:c');

  cleanup();
  render(<Subject initial="service:a AND status:b OR host:c" />);
  const mixed = editor();
  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: status:b` }));
  expect(mixed.state.doc.toString()).toBe('service:a AND host:c');

  cleanup();
  render(<Subject initial="service:x AND (service:a OR status:b)" />);
  const nested = editor();
  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: service:a` }));
  expect(nested.state.doc.toString()).toBe('service:x AND (status:b)');
  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: status:b` }));
  expect(nested.state.doc.toString()).toBe('service:x ');
  expect(undo(nested)).toBe(true);
  expect(nested.state.doc.toString()).toBe('service:x AND (status:b)');
});

it('cleans a leading connector on Delete and supports Backspace removal at the end', () => {
  render(<Subject initial="service:a AND status:b" />);
  const view = editor();
  const service = view.state.doc.toString().indexOf('service:a');
  act(() => view.dispatch({ selection: { anchor: service } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Delete' });
  expect(view.state.doc.toString()).toBe('status:b');
  expect(undo(view)).toBe(true);
  expect(view.state.doc.toString()).toBe('service:a AND status:b');

  const end = view.state.doc.length;
  act(() => view.dispatch({ selection: { anchor: end } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('service:a ');
});

it('removes a unary NOT with its operand and leaves negative-term boundaries intact', () => {
  render(<Subject initial="service:a AND NOT status:b" />);
  const view = editor();
  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: status:b` }));
  expect(view.state.doc.toString()).toBe('service:a ');
  expect(undo(view)).toBe(true);
  expect(view.state.doc.toString()).toBe('service:a AND NOT status:b');

  cleanup();
  render(<Subject initial="service:a AND -status:b" />);
  const negative = editor();
  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: -status:b` }));
  expect(negative.state.doc.toString()).toBe('service:a ');

  cleanup();
  render(<Subject initial="NOT NOT service:a AND status:b" />);
  const repeatedNot = editor();
  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: service:a` }));
  expect(repeatedNot.state.doc.toString()).toBe('status:b');
});

it('keeps a token being typed in ordinary character editing until it is committed', () => {
  render(<Subject initial="" />);
  const view = editor();
  view.focus();
  act(() => view.dispatch({ changes: { from: 0, insert: 'codex' }, selection: { anchor: 5 } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('code');
  act(() => view.dispatch({ changes: { from: 4, insert: 'x ' }, selection: { anchor: 6 } }));
  act(() => view.dispatch({ selection: { anchor: 5 } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe(' ');
});

it('gives complete tokens an accessible remove control and removes the preferred right connector', () => {
  render(<Subject initial='a AND status:[1 TO 3] OR "request failed"' />);
  const view = editor();
  const remove = screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: status:[1 TO 3]` });
  remove.focus();
  expect(remove).toHaveFocus();
  fireEvent.keyDown(remove, { key: 'Escape' });
  expect(view.contentDOM).toHaveFocus();
  fireEvent.click(remove);
  expect(view.state.doc.toString()).toBe('a AND "request failed"');
  expect(undo(view)).toBe(true);
  expect(view.state.doc.toString()).toBe('a AND status:[1 TO 3] OR "request failed"');
});

it('allows character Backspace while typing after a remove button deletes a token', () => {
  render(<Subject initial="service:foo" />);
  const view = editor();
  fireEvent.click(screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: service:foo` }));
  expect(view.state.doc.toString()).toBe('');
  act(() => view.dispatch({ changes: { from: 0, insert: 'codex' }, selection: { anchor: 5 } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('cod');
});

it('deletes a committed token forward at its start and edits characters inside it', () => {
  render(<Subject initial="codex AND service:foo" />);
  const view = editor();
  view.focus();
  act(() => view.dispatch({ selection: { anchor: 10 } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Delete' });
  expect(view.state.doc.toString()).toBe('codex ');
  expect(undo(view)).toBe(true);
  act(() => view.dispatch({ selection: { anchor: 11 } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Delete' });
  expect(view.state.doc.toString()).toBe('codex AND srvice:foo');
});

it('backs through a trailing space then removes only the previous committed token', () => {
  render(<Subject initial="codex AND service:foo " />);
  const view = editor();
  view.focus();
  act(() => view.dispatch({ selection: { anchor: view.state.doc.length } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('codex AND service:foo');
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('codex ');
});

it('closes suggestions after token removal and isolates its undo from preceding input', async () => {
  render(<Subject initial="" />);
  const view = editor();
  view.focus();
  act(() => view.dispatch({ changes: { from: 0, insert: 'codex ' }, selection: { anchor: 6 } }));
  const remove = screen.getByRole('button', { name: `${i18n.t('explore.logAuthoring.removeToken')}: codex` });
  fireEvent.click(remove);
  expect(view.state.doc.toString()).toBe(' ');
  expect(view.contentDOM).toHaveFocus();
  await waitFor(() => expect(view.contentDOM).toHaveAttribute('aria-expanded', 'false'));
  expect(undo(view)).toBe(true);
  expect(view.state.doc.toString()).toBe('codex ');
});

it('leaves incomplete terms as ordinary editable text', () => {
  render(<Subject initial='service:"unfinished' />);
  const view = editor();
  expect(view.contentDOM.querySelector('.hb-log-query-remove')).toBeNull();
  act(() => view.dispatch({ selection: { anchor: view.state.doc.length } }));
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('service:"unfinishe');
});

it('updates the caret and completion after an external query change', async () => {
  render(<Subject />);
  const view = editor();
  act(() => view.dispatch({ selection: { anchor: view.state.doc.length } }));
  fireEvent.click(screen.getByRole('button', { name: 'External query' }));
  expect(view.state.doc.toString()).toBe('service:che');
  expect(view.state.selection.main.head).toBe(11);
  view.focus();
  await waitFor(() => expect(requestField).toHaveBeenLastCalledWith('service'));
  fireEvent.keyDown(view.contentDOM, { key: 'ArrowDown' });
  await waitFor(() => expect(view.contentDOM).toHaveAttribute('aria-activedescendant'));
  fireEvent.keyDown(view.contentDOM, { key: 'Enter' });
  expect(view.state.doc.toString()).toBe('service:"checkout"');
});
it('shows a native placeholder and updates it and the label with locale', async () => {
  const page = render(<Subject initial="" />);
  const view = editor();
  expect(view.contentDOM.querySelector('.cm-placeholder')).toHaveTextContent(
    i18n.t('explore.logAuthoring.exampleHint', { example: i18n.t('explore.logAuthoring.example') })
  );
  await loadLocale('zh-CN');
  page.rerender(<Subject initial="" />);
  expect(view.contentDOM).toHaveAttribute('aria-label', i18n.t('explore.queryLabels.logs'));
  expect(view.contentDOM.querySelector('.cm-placeholder')).toHaveTextContent(
    i18n.t('explore.logAuthoring.exampleHint', { example: i18n.t('explore.logAuthoring.example') })
  );
  await loadLocale('en-US');
});

it('suggests a service observed in the current logs without applying the example', () => {
  render(<Subject initial="" suggestedService="codex-app-server" />);
  const view = editor();
  expect(view.state.doc.toString()).toBe('');
  expect(view.contentDOM.querySelector('.cm-placeholder')).toHaveTextContent(
    i18n.t('explore.logAuthoring.exampleHint', { example: 'service:"codex-app-server"' })
  );
});

it('shows complete field conditions and restores recent searches with their full saved context', async () => {
  const recentDraft = draftFromQuery({
    signal: 'logs',
    timeRange: 'last-30m',
    query: 'service:api',
    resourceFilter: 'region = "east"'
  });
  if (recentDraft.signal !== 'logs') throw new Error('Expected a logs search');
  const recent = { ...recentDraft, executedAt: 1 };
  const restore = vi.fn();
  render(<Subject initial="service:che" recentQueries={[recent]} restoreRecentQuery={restore} />);
  const view = editor();
  view.focus();
  await waitFor(() => expect(screen.getByRole('option', { name: /checkout/ })).toBeInTheDocument());
  expect(screen.getByRole('option', { name: /service:"checkout"/ })).toBeInTheDocument();
  expect(screen.getByText(i18n.t('explore.recentLogs.statusUnknown'))).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'service:api' }));
  expect(restore).toHaveBeenCalledWith(recent);
  expect(restore.mock.calls[0]?.[0].resourceFilter).toBe('region = "east"');
});

it('offers and inserts a complete condition from a bare field prefix', async () => {
  render(<Subject initial="sta" />);
  const view = editor();
  view.focus();
  await waitFor(() => expect(screen.getByRole('option', { name: /status:"INFO"/ })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('option', { name: /status:"INFO"/ }));
  expect(view.state.doc.toString()).toBe('status:"INFO"');
});

it('explains the bounded scalar-or-array numeric syntax in the existing help', () => {
  const translate = ((key: string) => key) as TFunction;
  render(<Subject translate={translate} />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAuthoring.help' }));
  const help = screen.getByRole('region', { name: 'explore.logAuthoring.help' });
  expect(within(help).getByText('explore.logAuthoring.messageHelp')).toBeInTheDocument();
  expect(within(help).getByText('explore.logAuthoring.fullTextHelp')).toBeInTheDocument();
  const bounds = within(help).getByText('explore.logAuthoring.collectionBounds');
  expect(bounds.closest('details')).not.toHaveAttribute('open');
  fireEvent.click(within(help).getByText('explore.logAuthoring.advancedHelp'));
  expect(bounds.closest('details')).toHaveAttribute('open');
  for (const key of [
    'collectionHelp',
    'collectionBounds',
    'collectionExample',
    'collectionRangeExample',
    'collectionGroupExample',
    'collectionTextHelp',
    'collectionTextExample',
    'collectionEmptyExample',
    'collectionNestedHelp',
    'collectionNestedExample',
    'collectionNestedBounds'
  ]) {
    expect(within(help).getByText(`explore.logAuthoring.${key}`)).toBeInTheDocument();
  }
});

it('allows keyboard users to focus the scrollable syntax help', () => {
  render(<Subject />);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logAuthoring.help') }));
  const help = screen.getByRole('region', { name: i18n.t('explore.logAuthoring.help') });
  help.focus();
  expect(help).toHaveFocus();
});

it('associates the real CodeMirror combobox with the submitted error and clears invalid attributes on correction', () => {
  const props = {
    value: 'service:"',
    syntax: 'structured-v1',
    onChange: vi.fn(),
    t: i18n.t,
    invalid: true,
    errorId: 'query-error'
  };
  const { rerender } = render(
    <>
      <ExploreLogSearchInput {...props} />
      <p id="query-error" role="alert">
        Unclosed quote
      </p>
    </>
  );
  const combo = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
  expect(combo).toHaveAttribute('aria-invalid', 'true');
  expect(combo).toHaveAttribute('aria-describedby', 'query-error');
  expect(combo).toHaveAccessibleDescription('Unclosed quote');
  rerender(<ExploreLogSearchInput {...props} invalid={false} errorId={undefined} />);
  expect(combo).not.toHaveAttribute('aria-invalid');
  expect(combo).not.toHaveAttribute('aria-describedby');
});
