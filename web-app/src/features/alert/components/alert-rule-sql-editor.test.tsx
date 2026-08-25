/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
