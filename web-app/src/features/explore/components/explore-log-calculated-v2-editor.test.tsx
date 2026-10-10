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

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { redo, undo } from '@codemirror/commands';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import en from '@/assets/i18n/explore/en-us.json';
import zhCn from '@/assets/i18n/explore/zh-cn.json';
import zhTw from '@/assets/i18n/explore/zh-tw.json';
import ja from '@/assets/i18n/explore/ja-jp.json';
import pt from '@/assets/i18n/explore/pt-br.json';
import { calculatedFunctions } from '../model/explore-calculated-function-catalog';
import type { LogFacetField } from '../model/explore-log-facets';
import { ExploreLogCalculatedV2Editor } from './explore-log-calculated-v2-editor';

const t = ((key: string) => key) as TFunction;
afterEach(cleanup);

it('keeps function descriptions and validation messages in every locale', () => {
  for (const catalog of [en, zhCn, zhTw, ja, pt]) {
    expect(catalog.explore.logCalculatedV2.generate).toBeTruthy();
    expect(Object.keys(catalog.explore.logCalculatedV2.functionDescriptions).sort()).toEqual(
      calculatedFunctions.map(item => item.name).sort()
    );
    expect(catalog.explore.logCalculatedV2.validation.type_mismatch).toBeTruthy();
    expect(catalog.explore.logCalculatedV2.validationPaths.expression).toBeTruthy();
  }
});

it('lists supported calculated functions and resource source with exact names and examples', () => {
  const byName = new Map(calculatedFunctions.map(item => [item.name, item]));
  expect(byName.get('resource')).toMatchObject({
    supported: true,
    signature: 'resource("key")',
    example: 'resource("host.name") → "web-01"'
  });
  expect(byName.get('regexp_like')).toMatchObject({
    supported: true,
    signature: 'regexp_like(text, pattern)',
    example: 'regexp_like("abc", "b") → true'
  });
  expect(byName.get('regexp_replace')).toMatchObject({
    supported: true,
    signature: 'regexp_replace(text, pattern, replacement)',
    example: 'regexp_replace("1x2x3", "[0-9]", "#") → "#x2x3"'
  });
  expect(byName.get('levenshtein_distance')).toMatchObject({
    supported: true,
    signature: 'levenshtein_distance(left, right)',
    example: 'levenshtein_distance("kitten", "sitting") → 3'
  });
  expect(byName.get('entropy')).toMatchObject({
    supported: true,
    signature: 'entropy(text)',
    example: 'entropy("abab") → 1'
  });
  expect(en.explore.logCalculatedV2.functionDescriptions.entropy).toContain('UTF-8 byte');
  expect(byName.has('replace')).toBe(false);
});

function subject(validate = vi.fn().mockResolvedValue({ valid: true }), sources: LogFacetField[] = []) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(
    <ExploreLogCalculatedV2Editor
      raw={undefined}
      validate={validate}
      t={t}
      onApply={onApply}
      onClose={onClose}
      sources={sources}
    />
  );
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.formula' }));
  const view = EditorView.findFromDOM(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.expression' }))!;
  return { view, validate, onApply, onClose };
}

function selectEngine(name: 'Regex' | 'Grok') {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'explore.logCalculatedV2.engine' }));
  fireEvent.click(screen.getByText(name));
}

it('selects a trusted raw resource source while preserving its wire field ID', async () => {
  const { validate, onApply } = subject(undefined, [
    { id: 'resource:service.name', source: 'resource', key: 'service.name' }
  ]);
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  selectEngine('Regex');
  const source = screen.getByRole('combobox', { name: 'explore.logCalculatedV2.source' });
  expect(screen.getByText('explore.logCalculatedV2.messageBody')).toBeInTheDocument();
  fireEvent.mouseDown(source);
  fireEvent.click(await screen.findByText('explore.logCalculatedV2.resourceSource'));
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' }), {
    target: { value: '(?<token>GET)' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  await waitFor(() => expect(onApply).toHaveBeenCalledOnce());
  expect(validate.mock.calls[0]?.[1]).toBeUndefined();
  expect(screen.queryByRole('textbox', { name: 'explore.logCalculatedV2.captures' })).not.toBeInTheDocument();
  expect(JSON.parse(String(onApply.mock.calls[0]?.[0]))).toMatchObject({
    fields: [{ source: 'resource:service.name' }]
  });
});

it('offers only supported builtin source IDs for extraction', async () => {
  const { onApply } = subject(undefined, [
    { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' },
    { id: 'builtin:environment', source: 'builtin', key: 'environment' },
    { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' }
  ]);
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  selectEngine('Regex');
  const source = screen.getByRole('combobox', { name: 'explore.logCalculatedV2.source' });
  fireEvent.mouseDown(source);
  for (const key of ['serviceName', 'environment', 'severityCategory']) {
    expect(await screen.findByText(`explore.logFacets.builtin.${key}`)).toBeInTheDocument();
  }
  fireEvent.click(screen.getByText('explore.logFacets.builtin.serviceName'));
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' }), {
    target: { value: '(?<serviceName>\\S+)' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  await waitFor(() => expect(onApply).toHaveBeenCalledOnce());
  expect(JSON.parse(String(onApply.mock.calls[0]?.[0])).fields[0]).toMatchObject({
    source: 'builtin:serviceName',
    captures: [{ name: 'serviceName' }]
  });
});

it('defaults new extraction definitions to Grok, generates a pattern and previews it, and supports underscore names', async () => {
  const validate = vi.fn().mockResolvedValue({
    valid: true,
    preview: { definitionId: 'c1', values: { extracted_value: 'codex-app-server' } }
  });
  render(
    <ExploreLogCalculatedV2Editor
      raw={undefined}
      validate={validate}
      t={t}
      onApply={vi.fn()}
      onClose={vi.fn()}
      sources={[{ id: 'attribute:audit.token', source: 'attribute', key: 'audit.token' }]}
    />
  );
  expect(screen.getByText('Grok')).toBeInTheDocument();
  const generate = screen.getByRole('button', { name: 'explore.logCalculatedV2.generate' });
  expect(generate).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.sample' }), {
    target: { value: 'codex-app-server' }
  });
  expect(generate).toBeEnabled();
  fireEvent.click(generate);
  expect(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' })).toHaveValue(
    '^%{notSpace:extracted_value}$'
  );
  await waitFor(() => expect(validate).toHaveBeenCalledOnce());
  expect(validate.mock.calls[0]?.[1]).toEqual({ definitionId: 'c1', sourceText: 'codex-app-server' });
  expect(await screen.findByText('"codex-app-server"')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.sample' }), {
    target: { value: 'codex.*' }
  });
  const source = screen.getByRole('combobox', { name: 'explore.logCalculatedV2.source' });
  fireEvent.mouseDown(source);
  fireEvent.click(screen.getByText('explore.logCalculatedV2.attributeSource'));
  fireEvent.click(generate);
  expect(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' })).toHaveValue(
    '^%{notSpace:audit_token}$'
  );
  expect(screen.queryByRole('textbox', { name: 'explore.logCalculatedV2.captures' })).not.toBeInTheDocument();
  for (const [sample, pattern] of [
    ['null', '^%{notSpace:audit_token}$'],
    ['-12', '^%{integer:audit_token}$'],
    ['1.25', '^%{number:audit_token}$'],
    ['two words', '^%{data:audit_token}$']
  ]) {
    fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.sample' }), {
      target: { value: sample }
    });
    fireEvent.click(generate);
    expect(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' })).toHaveValue(pattern);
  }
  await waitFor(() => expect(screen.getByText('common.confirm').closest('button')).toBeEnabled());
});

it('generates an anchored Regex capture without interpolating sample syntax', () => {
  subject();
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  selectEngine('Regex');
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.sample' }), {
    target: { value: 'codex.*' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.generate' }));
  expect(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' })).toHaveValue(
    '^(?<extracted_value>\\S+)$'
  );
  expect(screen.queryByRole('textbox', { name: 'explore.logCalculatedV2.captures' })).not.toBeInTheDocument();
});

it('avoids Grok generation for multiline samples and emits newline-safe Regex', () => {
  const { validate } = subject();
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  const sample = screen.getByRole('textbox', { name: 'explore.logCalculatedV2.sample' });
  fireEvent.change(sample, { target: { value: 'line one\nline two' } });
  expect(screen.getByRole('button', { name: 'explore.logCalculatedV2.generate' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('explore.logCalculatedV2.grokMultilineUnsupported');
  selectEngine('Regex');
  const generate = screen.getByRole('button', { name: 'explore.logCalculatedV2.generate' });
  expect(generate).toBeEnabled();
  fireEvent.click(generate);
  expect(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' })).toHaveValue(
    '^(?<extracted_value>[\\s\\S]+)$'
  );
  expect(validate).toHaveBeenCalledOnce();
});

it('derives names only from unescaped named captures outside character classes', async () => {
  const { validate } = subject();
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  selectEngine('Regex');
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' }), {
    target: { value: '^\\(?<literal>\\) [(?<inside>] (?<actual_name>\\S+)$' }
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.sample' }), {
    target: { value: 'sample' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.preview' }));
  await waitFor(() => expect(validate).toHaveBeenCalledOnce());
  expect(JSON.parse(String(validate.mock.calls[0]?.[0])).fields[0].captures).toEqual([{ name: 'actual_name' }]);
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' }), {
    target: { value: '(?<broken' }
  });
  await waitFor(() => expect(screen.getByText('explore.logCalculatedV2.preview').closest('button')).toBeDisabled());
});

it('does not enable validation for malformed Grok capture declarations', () => {
  subject();
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' }), {
    target: { value: '^%{notSpace:valid}%{unknown:bad-name}$' }
  });
  expect(screen.getByRole('button', { name: 'explore.logCalculatedV2.preview' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('explore.logCalculatedV2.namedCaptureRequired');
  expect(screen.getByRole('button', { name: 'common.confirm' })).toBeDisabled();
});

it('searches the function catalog and inserts at the retained cursor without replacing the expression', () => {
  const { view } = subject();
  act(() => view.dispatch({ changes: { from: 0, insert: '@duration_ms + 1' }, selection: { anchor: 13 } }));
  act(() => view.focus());
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.functions' }));
  const search = screen.getByRole('textbox', { name: 'explore.logCalculatedV2.searchFunctions' });
  fireEvent.change(search, { target: { value: 'round' } });
  expect(screen.getByText('round(value, [precision])')).toBeInTheDocument();
  expect(screen.getByText('round(-1234.01, -1) → -1230')).toBeInTheDocument();
  expect(screen.queryByText('explore.logCalculatedV2.functionCategories.string')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: 'round' }));
  expect(view.state.doc.toString()).toBe('@duration_ms round() + 1');
  expect(view.state.selection.main.head).toBe('@duration_ms round('.length);
  act(() => {
    expect(undo(view)).toBe(true);
  });
  expect(view.state.doc.toString()).toBe('@duration_ms + 1');
  act(() => {
    expect(redo(view)).toBe(true);
  });
  expect(view.state.doc.toString()).toBe('@duration_ms round() + 1');
});

it('prefills a selected field expression and exposes the matching log context', () => {
  const row = { attributes: { 'event.name': 'codex.api_request' } } as never;
  render(
    <ExploreLogCalculatedV2Editor
      raw={undefined}
      initialExpression="@event.name"
      contextRow={row}
      validate={vi.fn().mockResolvedValue({ valid: true })}
      t={t}
      onApply={vi.fn()}
      onClose={vi.fn()}
    />
  );
  const view = EditorView.findFromDOM(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.expression' }))!;
  expect(view.state.doc.toString()).toBe('@event.name');
  fireEvent.click(screen.getByText('explore.logFieldMenu.showContextFromLog'));
  expect(screen.getByText(/codex\.api_request/)).toBeInTheDocument();
});

it('appends a function when the expression editor was never focused', () => {
  const { view } = subject();
  act(() => view.dispatch({ changes: { from: 0, insert: '@duration_ms' } }));
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.functions' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'abs' }));
  expect(view.state.doc.toString()).toBe('@duration_ms abs()');
});

it('inserts entropy once by keyboard and validates the byte-frequency formula before saving', async () => {
  const { view, validate, onApply } = subject();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.functions' }));
  const search = screen.getByRole('textbox', { name: 'explore.logCalculatedV2.searchFunctions' });
  fireEvent.change(search, { target: { value: 'entropy' } });
  const item = screen.getByRole('menuitem', { name: 'entropy' });
  expect(item).not.toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByText('entropy("abab") → 1')).toBeInTheDocument();
  fireEvent.keyDown(search, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(item);
  fireEvent.keyDown(item, { key: 'Enter' });
  expect(fireEvent.click(item)).toBe(false);
  expect(view.state.doc.toString()).toBe('entropy()');
  act(() => view.dispatch({ changes: { from: 'entropy('.length, insert: '"ééa"' } }));
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  await waitFor(() => expect(validate).toHaveBeenCalledOnce());
  await waitFor(() => expect(onApply).toHaveBeenCalledOnce());
  expect(JSON.parse(String(onApply.mock.calls[0]?.[0]))).toMatchObject({
    fields: [{ kind: 'formula', expression: 'entropy("ééa")' }]
  });
});

it('cancels an inserted entropy formula without validation or draft write', () => {
  const { view, validate, onApply, onClose } = subject();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.functions' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.searchFunctions' }), {
    target: { value: 'entropy' }
  });
  fireEvent.click(screen.getByRole('menuitem', { name: 'entropy' }));
  expect(view.state.doc.toString()).toBe('entropy()');
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onApply).not.toHaveBeenCalled();
  expect(validate).not.toHaveBeenCalled();
});

it('supports select all and deletion in the CodeMirror expression', () => {
  const { view } = subject();
  act(() => view.dispatch({ changes: { from: 0, insert: '@duration_ms / 1000' } }));
  act(() => view.focus());
  fireEvent.keyDown(view.contentDOM, { key: 'a', ctrlKey: true });
  expect(view.state.selection.main.from).toBe(0);
  expect(view.state.selection.main.to).toBe(view.state.doc.length);
  fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
  expect(view.state.doc.toString()).toBe('');
});

it('supports ArrowDown then a single menu activation to insert a function', () => {
  const { view } = subject();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.functions' }));
  const search = screen.getByRole('textbox', { name: 'explore.logCalculatedV2.searchFunctions' });
  search.focus();
  fireEvent.change(search, { target: { value: 'round' } });
  fireEvent.keyDown(search, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'round' }));
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
  expect(fireEvent.click(screen.getByRole('menuitem', { name: 'round' }))).toBe(false);
  expect(view.state.doc.toString()).toBe('round()');
});

it('inserts regexp_replace once from keyboard search and validates before saving', async () => {
  const { view, validate, onApply } = subject();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.functions' }));
  const search = screen.getByRole('textbox', { name: 'explore.logCalculatedV2.searchFunctions' });
  fireEvent.change(search, { target: { value: 'regexp_replace' } });
  const item = screen.getByRole('menuitem', { name: 'regexp_replace' });
  expect(item).not.toHaveAttribute('aria-disabled', 'true');
  fireEvent.keyDown(search, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(item);
  fireEvent.keyDown(item, { key: 'Enter' });
  expect(fireEvent.click(item)).toBe(false);
  expect(view.state.doc.toString()).toBe('regexp_replace()');
  act(() => view.dispatch({ changes: { from: 'regexp_replace('.length, insert: '"1x2x3","[0-9]","#"' } }));
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  await waitFor(() => expect(validate).toHaveBeenCalledOnce());
  await waitFor(() => expect(onApply).toHaveBeenCalledOnce());
  expect(JSON.parse(String(onApply.mock.calls[0]?.[0]))).toMatchObject({
    fields: [{ kind: 'formula', expression: 'regexp_replace("1x2x3","[0-9]","#")' }]
  });
});

it('cancels an inserted regexp_like formula without validating or writing the draft', () => {
  const { view, validate, onApply, onClose } = subject();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.functions' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.searchFunctions' }), {
    target: { value: 'regexp_like' }
  });
  fireEvent.click(screen.getByRole('menuitem', { name: 'regexp_like' }));
  expect(view.state.doc.toString()).toBe('regexp_like()');
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onApply).not.toHaveBeenCalled();
  expect(validate).not.toHaveBeenCalled();
});

it('closes only the function picker on Escape and keeps the formula draft open', () => {
  const { onClose } = subject();
  const trigger = screen.getByRole('button', { name: 'explore.logCalculatedV2.functions' });
  fireEvent.click(trigger);
  const search = screen.getByRole('textbox', { name: 'explore.logCalculatedV2.searchFunctions' });
  search.focus();
  fireEvent.keyDown(search, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(trigger);
});

it('keeps the formula modal open when Escape arrives before picker search receives focus', () => {
  const { onClose } = subject();
  const trigger = screen.getByRole('button', { name: 'explore.logCalculatedV2.functions' });
  fireEvent.click(trigger);
  fireEvent.keyDown(trigger, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(trigger);
});

it('previews explicit sample extraction without applying it and preserves null separately from empty text', async () => {
  const validate = vi
    .fn()
    .mockResolvedValueOnce({
      valid: true,
      preview: { definitionId: 'c1', values: { token: 'GET', optional: null, empty: '' } },
      errors: []
    })
    .mockResolvedValueOnce({ valid: true, preview: null, errors: [] });
  const { onApply } = subject(validate);
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'explore.logCalculatedV2.engine' }));
  fireEvent.click(screen.getByText('Regex'));
  expect(screen.getByText('explore.logCalculatedV2.regexHint')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' })).toHaveAttribute(
    'placeholder',
    '^(?<token>[A-Za-z]+)$'
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' }), {
    target: { value: ' (?<token>[A-Z]+)(?<optional>[a-z]*)(?<empty>.*) ' }
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.sample' }), {
    target: { value: 'GET' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.preview' }));
  await waitFor(() => expect(validate).toHaveBeenCalledOnce());
  expect(validate.mock.calls[0]?.[1]).toEqual({ definitionId: 'c1', sourceText: 'GET' });
  expect(screen.getByText('explore.logCalculatedV2.sampleOnly')).toBeInTheDocument();
  expect(screen.getByText('explore.logCalculatedV2.noValue')).toBeInTheDocument();
  expect(screen.getByText('explore.logCalculatedV2.emptyValue')).toBeInTheDocument();
  expect(screen.getAllByText('explore.logCalculatedV2.previewTypes.string')).toHaveLength(2);
  expect(screen.getByText('explore.logCalculatedV2.previewTypes.null')).toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
  const confirm = screen.getByText('common.confirm').closest('button')!;
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);
  await waitFor(() => expect(onApply).toHaveBeenCalledOnce());
  expect(validate.mock.calls[1]?.[1]).toBeUndefined();
  expect(JSON.parse(String(onApply.mock.calls[0]?.[0]))).toMatchObject({
    fields: [
      {
        kind: 'extraction',
        engine: 'regex',
        source: 'builtin:body',
        pattern: ' (?<token>[A-Z]+)(?<optional>[a-z]*)(?<empty>.*) ',
        captures: [{ name: 'token' }, { name: 'optional' }, { name: 'empty' }]
      }
    ]
  });
});

it('rejects a sample over 16 KiB in UTF-8 before requesting preview', () => {
  const { validate } = subject();
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  selectEngine('Regex');
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' }), {
    target: { value: '(?<token>.*)' }
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.sample' }), {
    target: { value: '😀'.repeat(4097) }
  });
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.preview' }));
  expect(validate).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('explore.logCalculatedV2.sampleTooLarge');
});

it('accepts a sample of exactly 16 KiB in UTF-8 for preview', async () => {
  const { validate } = subject();
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  selectEngine('Regex');
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' }), {
    target: { value: '(?<token>.*)' }
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'explore.logCalculatedV2.sample' }), {
    target: { value: '😀'.repeat(4096) }
  });
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.preview' }));
  await waitFor(() => expect(validate).toHaveBeenCalledOnce());
  expect(new TextEncoder().encode(String(validate.mock.calls[0]?.[1]?.sourceText)).byteLength).toBe(16384);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('discards a pending preview when the pattern changes', async () => {
  const resolvers: Array<
    (value: { valid: boolean; preview: { definitionId: string; values: { token: string } } }) => void
  > = [];
  const validate = vi.fn().mockImplementation(
    () =>
      new Promise(value => {
        resolvers.push(value);
      })
  );
  const { onApply } = subject(validate);
  fireEvent.click(screen.getByRole('radio', { name: 'explore.logCalculatedV2.extraction' }));
  selectEngine('Regex');
  const pattern = screen.getByRole('textbox', { name: 'explore.logCalculatedV2.pattern' });
  fireEvent.change(pattern, { target: { value: '(?<token>GET)' } });
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculatedV2.preview' }));
  fireEvent.change(pattern, { target: { value: '(?<token>POST)' } });
  fireEvent.click(screen.getByText('explore.logCalculatedV2.preview').closest('button')!);
  await act(async () => {
    resolvers[0]!({ valid: true, preview: { definitionId: 'c1', values: { token: 'GET' } } });
    await Promise.resolve();
  });
  expect(screen.queryByText('GET')).not.toBeInTheDocument();
  expect(
    screen.getByText('explore.logCalculatedV2.preview').closest('button')?.querySelector('[aria-label="loading"]')
  ).toBeInTheDocument();
  await act(async () => {
    resolvers[1]!({ valid: true, preview: { definitionId: 'c1', values: { token: 'POST' } } });
    await Promise.resolve();
  });
  expect(screen.getByText('"POST"')).toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
});

it('shows a bounded typed validation issue and keeps the editor open', async () => {
  const validate = vi
    .fn()
    .mockResolvedValue({ valid: false, errors: [{ path: 'fields[0].expression', code: 'type_mismatch' }] });
  const { view, onApply, onClose } = subject(validate);
  act(() => view.dispatch({ changes: { from: 0, insert: 'round(@duration_ms, 1.0)' } }));
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('explore.logCalculatedV2.validation.type_mismatch');
  expect(screen.getByRole('alert')).toHaveTextContent('explore.logCalculatedV2.validationPaths.expression');
  expect(onApply).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});
