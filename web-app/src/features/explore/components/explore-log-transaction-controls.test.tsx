/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { ExploreLogTransactionControls } from './explore-log-transaction-controls';
const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
it('offers only Fields from an ordinary draft', () => {
  const onMode = vi.fn();
  render(
    <ExploreLogTransactionControls
      t={t}
      mode="fields"
      raw={undefined}
      pending={false}
      onChange={vi.fn()}
      onMode={onMode}
      fields={[]}
    />
  );
  expect(screen.getByRole('button', { name: 'explore.logTransactions.fields' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.queryByRole('button', { name: 'explore.logPatterns.mode' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'explore.logTransactions.transactions' })).not.toBeInTheDocument();
  expect(onMode).not.toHaveBeenCalled();
});
it('explains invalid dormant transaction settings in Patterns mode', () => {
  render(
    <ExploreLogTransactionControls
      t={t}
      mode="patterns"
      raw="broken"
      pending={false}
      onChange={vi.fn()}
      onMode={vi.fn()}
      fields={[]}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent('explore.logPatterns.invalidSettings');
  expect(screen.getByRole('button', { name: 'explore.logPatterns.mode' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: 'explore.logTransactions.transactions' })).not.toBeInTheDocument();
});
it('authors a calculated formula in the applied-query draft', () => {
  const onCalculatedChange = vi.fn<(raw: string | undefined) => void>();
  render(
    <ExploreLogTransactionControls
      t={t}
      mode="calculated"
      raw={undefined}
      rawCalculated={JSON.stringify({ version: 1, name: 'gap', kind: 'formula', left: '', operator: '-', right: '' })}
      pending
      onChange={vi.fn()}
      onCalculatedChange={onCalculatedChange}
      onMode={vi.fn()}
      fields={[]}
    />
  );
  const grouping = screen.getByRole('group', { name: 'explore.logTransactions.groupInto' });
  expect(grouping).not.toContainElement(screen.getByRole('button', { name: 'explore.logCalculated.mode' }));
  expect(screen.queryByRole('combobox', { name: 'explore.logCalculated.left' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculated.mode' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.change(screen.getByRole('combobox', { name: 'explore.logCalculated.left' }), {
    target: { value: 'attribute:client_latency' }
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'explore.logCalculated.right' }), {
    target: { value: 'attribute:server_latency' }
  });
  expect(onCalculatedChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  expect(onCalculatedChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logCalculated.mode' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'explore.logCalculated.left' }), {
    target: { value: 'attribute:client_latency' }
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'explore.logCalculated.right' }), {
    target: { value: 'attribute:server_latency' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  expect(JSON.parse(onCalculatedChange.mock.calls[0]![0]!)).toMatchObject({
    kind: 'formula',
    left: 'attribute:client_latency'
  });
});
it('suggests supported root fields without selecting one or changing the query', () => {
  const onChange = vi.fn<(raw: string | undefined) => void>();
  const onMode = vi.fn();
  render(
    <ExploreLogTransactionControls
      t={t}
      mode="transactions"
      raw={undefined}
      pending
      onChange={onChange}
      onMode={onMode}
      fields={[
        { id: 'attribute:requestId', source: 'attribute', key: 'requestId' },
        { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' }
      ]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logTransactions.transactions' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  const input = screen.getByRole('combobox', { name: 'explore.logTransactions.field' });
  expect(input).toHaveValue('');
  expect(onChange).not.toHaveBeenCalled();
  expect(document.querySelector('datalist option')?.getAttribute('value')).toBe('attribute:requestId');
  expect(document.querySelectorAll('datalist option')).toHaveLength(1);
  fireEvent.change(input, { target: { value: 'attribute:requestId' } });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logTransactions.transactions' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'explore.logTransactions.field' }), {
    target: { value: 'attribute:requestId' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
  expect(JSON.parse(onChange.mock.calls[0]![0]!)).toMatchObject({ field: 'attribute:requestId', version: 1 });
  fireEvent.click(screen.getByRole('button', { name: 'explore.logTransactions.fields' }));
  expect(onMode).toHaveBeenCalledWith('fields');
});
it('preserves malformed drafts visibly and repairs them only by explicit Reset', () => {
  const onChange = vi.fn<(raw: string | undefined) => void>();
  const onMode = vi.fn();
  render(
    <ExploreLogTransactionControls
      t={t}
      mode="transactions"
      raw={'{broken'}
      pending={false}
      onChange={onChange}
      onMode={onMode}
      fields={[]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logTransactions.transactions' }));
  expect(screen.getByRole('combobox')).toHaveValue('{broken');
  expect(screen.getByRole('alert')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logTransactions.reset' }));
  expect(onChange).toHaveBeenCalledWith(undefined);
  expect(onMode).toHaveBeenCalledWith('fields');
});

it('keeps invalid dormant settings repair visible when returning to Fields', () => {
  const onChange = vi.fn();
  render(
    <ExploreLogTransactionControls
      t={t}
      mode="fields"
      raw={JSON.stringify({ version: 1, field: '', limit: 20, order: 'related-count-desc' })}
      pending
      onChange={onChange}
      onMode={vi.fn()}
      fields={[]}
    />
  );
  expect(screen.getByRole('alert')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logTransactions.reset' }));
  expect(onChange).toHaveBeenCalledWith(undefined);
});

it('keeps an empty legacy transaction draft explicitly recoverable in Fields', () => {
  const onChange = vi.fn();
  render(
    <ExploreLogTransactionControls
      t={t}
      mode="fields"
      raw=""
      pending={false}
      onChange={onChange}
      onMode={vi.fn()}
      fields={[]}
    />
  );
  expect(screen.getByRole('alert')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logTransactions.reset' }));
  expect(onChange).toHaveBeenCalledWith(undefined);
});

it('leaves invalid calculated mode when Reset clears its malformed draft', () => {
  const onCalculatedChange = vi.fn();
  const onMode = vi.fn();
  render(
    <ExploreLogTransactionControls
      t={t}
      mode="calculated"
      raw={undefined}
      rawCalculated="broken"
      pending={false}
      onChange={vi.fn()}
      onCalculatedChange={onCalculatedChange}
      onMode={onMode}
      fields={[]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logTransactions.reset' }));
  expect(onCalculatedChange).toHaveBeenCalledWith(undefined);
  expect(onMode).toHaveBeenCalledWith('fields');
});
