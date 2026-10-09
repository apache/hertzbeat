/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { SignalDashboardImport } from './signal-dashboard-import';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);
it('does not replace the newest selected import file when an older file read resolves later', async () => {
  const firstDoc = structuredClone(fixture);
  firstDoc.metadata.name = 'first-dashboard';
  const secondDoc = structuredClone(fixture);
  secondDoc.metadata.name = 'second-dashboard';
  let finishOld!: (value: string) => void;
  const first = new File([JSON.stringify(firstDoc)], 'first.json', { type: 'application/json' });
  const second = new File([JSON.stringify(secondDoc)], 'second.json', { type: 'application/json' });
  Object.defineProperty(first, 'text', {
    value: () =>
      new Promise<string>(resolve => {
        finishOld = resolve;
      })
  });
  Object.defineProperty(second, 'text', { value: () => Promise.resolve(JSON.stringify(secondDoc)) });
  render(<SignalDashboardImport open close={vi.fn()} submit={() => true} />);
  const input = screen.getByLabelText('signalDashboard.importFile');
  fireEvent.change(input, { target: { files: [first] } });
  fireEvent.change(input, { target: { files: [second] } });
  const selectedName = () =>
    (
      JSON.parse(screen.getByLabelText<HTMLTextAreaElement>('signalDashboard.documentJson').value || '{}') as {
        metadata?: { name?: string };
      }
    ).metadata?.name;
  await waitFor(() => expect(selectedName()).toBe('second-dashboard'));
  await act(async () => {
    finishOld(JSON.stringify(firstDoc));
    await Promise.resolve();
  });
  expect(selectedName()).toBe('second-dashboard');
});

it.each(['manual', 'close'])('retires an older file read after %s interaction', async interaction => {
  let finish!: (value: string) => void;
  const file = new File(['{}'], 'slow.json');
  Object.defineProperty(file, 'text', {
    value: () =>
      new Promise<string>(resolve => {
        finish = resolve;
      })
  });
  const { rerender } = render(<SignalDashboardImport open close={vi.fn()} submit={() => true} />);
  fireEvent.change(screen.getByLabelText('signalDashboard.importFile'), { target: { files: [file] } });
  if (interaction === 'manual')
    fireEvent.change(screen.getByLabelText('signalDashboard.documentJson'), { target: { value: 'Manual input' } });
  else rerender(<SignalDashboardImport open={false} close={vi.fn()} submit={() => true} />);
  await act(async () => {
    finish('Stale file');
    await Promise.resolve();
  });
  if (interaction === 'close') rerender(<SignalDashboardImport open close={vi.fn()} submit={() => true} />);
  expect(screen.getByLabelText('signalDashboard.documentJson')).toHaveValue(
    interaction === 'manual' ? 'Manual input' : ''
  );
});
it('retains invalid JSON and shows an accessible flat error after submission fails', () => {
  const submit = vi.fn(() => false);
  render(<SignalDashboardImport open close={vi.fn()} submit={submit} />);
  fireEvent.change(screen.getByLabelText('signalDashboard.documentJson'), { target: { value: 'Invalid JSON input' } });
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  expect(screen.getByLabelText('signalDashboard.documentJson')).toHaveValue('Invalid JSON input');
  expect(screen.getByRole('alert')).toHaveTextContent('signalDashboard.invalidDocument');
});
