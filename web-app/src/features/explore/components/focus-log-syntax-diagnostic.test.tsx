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
import { EditorView } from '@codemirror/view';
import { afterEach, expect, it } from 'vitest';
import { focusLogSyntaxDiagnostic } from './focus-log-syntax-diagnostic';
afterEach(cleanup);
it.each(['structured-v1', 'structured-v2'])(
  'selects the failed %s source and preserves newer or switched-syntax drafts',
  syntax => {
    const page = render(
      <div data-explore-query-layout>
        <div data-log-comparison-source="a">
          <input aria-label="a" defaultValue="other" />
        </div>
        <div data-log-comparison-source="b">
          <div data-log-search-syntax={syntax} data-testid="host" />
        </div>
        <div data-testid="error" />
      </div>
    );
    const editor = new EditorView({ parent: screen.getByTestId('host'), doc: 'service:' });
    editor.contentDOM.setAttribute('data-log-search-input', '');
    const region = screen.getByTestId('error');
    const diagnostic = { issue: 'missing_value', start: 8, end: 8, expression: 'service:' } as const;
    expect(focusLogSyntaxDiagnostic(region, diagnostic, 'b')).toBe(true);
    expect(editor.contentDOM).toHaveFocus();
    expect(editor.state.selection.main.head).toBe(8);
    editor.dispatch({ changes: { from: 8, insert: 'fixed' } });
    expect(focusLogSyntaxDiagnostic(region, diagnostic, 'b')).toBe(false);
    expect(editor.state.doc.toString()).toBe('service:fixed');
    editor.dispatch({ changes: { from: 8, to: 13 } });
    editor.dom.parentElement!.setAttribute('data-log-search-syntax', 'literal');
    expect(focusLogSyntaxDiagnostic(region, diagnostic, 'b')).toBe(false);
    editor.destroy();
    page.unmount();
  }
);
