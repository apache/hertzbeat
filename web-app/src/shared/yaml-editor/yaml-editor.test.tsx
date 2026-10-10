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

// @vitest-environment jsdom

import { EditorView } from '@codemirror/view';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RuntimeThemeContext } from '@/core/runtime-theme-context';
import type { RuntimeTheme } from '@/core/runtime-preferences';

import { YamlDiffEditor, YamlEditor } from './yaml-editor';

describe('YAML editors', () => {
  afterEach(cleanup);

  it('uses one native merge view for aligned comparison and draft editing', () => {
    const onChange = vi.fn();
    renderWithTheme(
      'default',
      <YamlDiffEditor
        originalAriaLabel="Current version"
        modifiedAriaLabel="Draft YAML"
        originalValue="app: mysql"
        modifiedValue={'app: mysql\nname: draft'}
        onChange={onChange}
      />
    );

    const host = document.querySelector('[data-hb-yaml-editor="codemirror-merge"]');
    expect(host).toContainElement(document.querySelector('.cm-mergeView'));
    expect(document.querySelectorAll('.cm-mergeView')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Current version' })).toHaveAttribute('contenteditable', 'false');
    const draft = screen.getByRole('textbox', { name: 'Draft YAML' });
    expect(draft).toHaveAttribute('contenteditable', 'true');

    const draftView = EditorView.findFromDOM(draft)!;
    act(() => draftView.dispatch({ changes: { from: draftView.state.doc.length, insert: '\nname: changed' } }));
    expect(onChange).toHaveBeenLastCalledWith('app: mysql\nname: draft\nname: changed');
  });

  it('keeps single-document create mode in the same adapter', () => {
    renderWithTheme('dark', <YamlEditor ariaLabel="Draft YAML" value="app: mysql" readOnly />);

    expect(document.querySelector('[data-hb-yaml-editor="codemirror"]')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Draft YAML' })).toHaveAttribute('contenteditable', 'false');
  });
  it.each(['single', 'merge'] as const)(
    'retains the latest %s draft while validation locks and unlocks an unchanged value',
    kind => {
      const onChange = vi.fn();
      const editor = (value: string, readOnly: boolean) => (
        <RuntimeThemeContext.Provider value={{ theme: 'default', setTheme: vi.fn() }}>
          {kind === 'single' ? (
            <YamlEditor ariaLabel="Draft YAML" value={value} readOnly={readOnly} onChange={onChange} />
          ) : (
            <YamlDiffEditor
              originalAriaLabel="Current version"
              modifiedAriaLabel="Draft YAML"
              originalValue="app: mysql"
              modifiedValue={value}
              readOnly={readOnly}
              onChange={onChange}
            />
          )}
        </RuntimeThemeContext.Provider>
      );
      const view = render(editor('', false));
      view.rerender(editor('app: [', false));
      view.rerender(editor('app: [', true));
      expect(screen.getByRole('textbox', { name: 'Draft YAML' })).toHaveTextContent('app: [');
      view.rerender(editor('app: [', false));
      expect(screen.getByRole('textbox', { name: 'Draft YAML' })).toHaveTextContent('app: [');
      expect(onChange).not.toHaveBeenCalled();
    }
  );
});

function renderWithTheme(theme: RuntimeTheme, editor: React.ReactNode) {
  return render(
    <RuntimeThemeContext.Provider value={{ theme, setTheme: vi.fn() }}>{editor}</RuntimeThemeContext.Provider>
  );
}
