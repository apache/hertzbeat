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

import { AlertRuleSqlEditor } from './alert-rule-sql-editor';

describe('Alert rule SQL editor', () => {
  afterEach(cleanup);

  it('preserves the draft and editor instance when validation or busy state changes', () => {
    const change = vi.fn();
    const { rerender } = render(
      <AlertRuleSqlEditor
        ariaLabel="SQL expression"
        disabled={false}
        invalid={false}
        value="SELECT * FROM hertzbeat_logs"
        onChange={change}
      />
    );
    const textbox = screen.getByRole('textbox', { name: 'SQL expression' });
    const view = EditorView.findFromDOM(textbox)!;

    act(() => {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: 'SELECT body FROM hertzbeat_logs'
        }
      });
    });
    expect(change).toHaveBeenLastCalledWith('SELECT body FROM hertzbeat_logs');

    rerender(
      <AlertRuleSqlEditor
        ariaLabel="SQL expression"
        disabled
        invalid
        value="SELECT body FROM hertzbeat_logs"
        onChange={change}
      />
    );

    const updatedTextbox = screen.getByRole('textbox', { name: 'SQL expression' });
    expect(updatedTextbox).toBe(textbox);
    expect(EditorView.findFromDOM(updatedTextbox)).toBe(view);
    expect(view.state.doc.toString()).toBe('SELECT body FROM hertzbeat_logs');
    expect(updatedTextbox).toHaveAttribute('aria-invalid', 'true');
    expect(updatedTextbox).toHaveAttribute('contenteditable', 'false');
  });
});
