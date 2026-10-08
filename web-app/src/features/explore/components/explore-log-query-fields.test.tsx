/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { TextField } from './explore-log-query-fields';
afterEach(cleanup);
describe('log scope suggestions', () => {
  it('loads suggestion state and visibility copy through the real locale loader', async () => {
    await initializeI18n();
    await loadLocale('en-US');
    for (const key of [
      'exploreLog.scopeSuggestions.hint',
      'exploreLog.scopeSuggestions.unavailable',
      'exploreLog.scopeSuggestions.empty',
      'exploreLog.visibilityHint'
    ]) {
      expect(i18n.exists(key)).toBe(true);
      expect(i18n.t(key)).not.toBe(key);
    }
  });
  it('closes suggestions on Escape while retaining focus and the typed value', async () => {
    const onChange = vi.fn();
    render(<TextField label="Service" placeholder="" value="" suggestions={['checkout']} onChange={onChange} />);
    const input = screen.getByRole('combobox');
    act(() => input.focus());
    expect(input).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(input, { key: 'Escape', keyCode: 27 });
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });
  it('retains manual text through loading, empty and failed suggestion changes', () => {
    const onChange = vi.fn();
    const props = { label: 'Service', placeholder: '', value: '', onChange };
    const view = render(<TextField {...props} suggestions={['checkout']} suggestionStatus="bounded" />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'checkout' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown', keyCode: 40 });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', keyCode: 13 });
    expect(onChange).toHaveBeenCalledWith('checkout');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'new-service' } });
    expect(onChange).toHaveBeenCalledWith('new-service');
    for (const status of ['loading', 'empty', 'failed']) {
      view.rerender(<TextField {...props} value="manual-service" suggestions={[]} suggestionStatus={status} />);
      expect(screen.getByRole('combobox')).toHaveValue('manual-service');
      expect(screen.getByRole('status')).toHaveTextContent(status);
    }
  });
});
