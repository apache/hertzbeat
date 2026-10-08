/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { FormEvent } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SignalEmptyState } from './signal-result-frame';

afterEach(cleanup);

it('returns focus to its own query form without submitting or replacing the draft', () => {
  const submit = vi.fn((event: FormEvent) => event.preventDefault());
  render(
    <>
      <form aria-label="Other query" tabIndex={-1} />
      <div data-explore-query-layout="split">
        <form aria-label="Query" tabIndex={-1} onSubmit={submit}>
          <input aria-label="Draft" defaultValue="service:checkout error" />
        </form>
        <SignalEmptyState title="No matches" hint="Review filters and time." reviewQueryLabel="Review query" />
      </div>
    </>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Review query' }));
  expect(screen.getByRole('form', { name: 'Query' })).toHaveFocus();
  expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('service:checkout error');
  expect(submit).not.toHaveBeenCalled();
});

it('does not invent a recovery action for other empty-state uses', () => {
  render(<SignalEmptyState title="No matches" hint="No data." />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
