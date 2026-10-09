/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { LogRow } from '../model/explore-signal-contract';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { traceAction } from './log-trace-action';
import { ExploreLogInspector } from './explore-log-inspector';
const validId = '1234567890abcdef1234567890abcdef';
const row: LogRow = {
  logRecordUid: 'reason-proof',
  timeUnixNano: '1000000000',
  observedTimeUnixNano: null,
  body: 'proof',
  severityText: 'INFO',
  severityNumber: 9,
  attributes: null,
  droppedAttributesCount: 0,
  traceId: null,
  spanId: null,
  traceFlags: 0,
  resource: null,
  resourceSchemaUrl: null,
  instrumentationScope: null,
  scopeSchemaUrl: null
};
const wrapper = ({ children }: { children: ReactNode }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
const props = {
  id: 'trace-reason-proof',
  selectedIndex: 0,
  rowCount: 1,
  evidenceCurrent: true,
  onSelectIndex: vi.fn(),
  onClose: vi.fn()
};
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it.each([
  [undefined, 'traceActionMissingId'],
  ['', 'traceActionMissingId'],
  ['bad', 'traceActionInvalidId'],
  [validId.toUpperCase(), 'traceActionInvalidId'],
  [validId, 'traceActionUnavailable']
])('explains a disabled trace action for %s without claiming retrieval', (traceId, reason) => {
  render(<ExploreLogInspector {...props} row={{ ...row, traceId: traceId ?? null }} />, { wrapper });
  const button = screen.getByRole('button', { name: i18n.t('explore.perses.openTraceAction') });
  expect(button).toBeDisabled();
  expect(button).toHaveAccessibleDescription(i18n.t(`explore.perses.${reason}`));
  expect(screen.getByText(i18n.t(`explore.perses.${reason}`))).toBeVisible();
});
it('gives stale evidence precedence and recomputes the reason when evidence and selection change', () => {
  const open = vi.fn();
  const view = render(<ExploreLogInspector {...props} row={row} evidenceCurrent={false} onOpenTrace={open} />, {
    wrapper
  });
  const action = () => screen.getByRole('button', { name: i18n.t('explore.perses.openTraceAction') });
  expect(action()).toHaveAccessibleDescription(i18n.t('explore.perses.traceActionStale'));
  fireEvent.click(action());
  expect(open).not.toHaveBeenCalled();
  view.rerender(<ExploreLogInspector {...props} row={{ ...row, traceId: validId }} onOpenTrace={open} />);
  expect(action()).toBeEnabled();
  expect(action()).not.toHaveAttribute('aria-describedby');
  fireEvent.click(action());
  expect(open).toHaveBeenCalledTimes(1);
  view.rerender(<ExploreLogInspector {...props} row={row} />);
  expect(action()).toHaveAccessibleDescription(i18n.t('explore.perses.traceActionMissingId'));
});

it('keeps valid IDs navigable without a retention preflight and rejects the existing invalid grammar', () => {
  const open = vi.fn();
  const query = { signal: 'logs', timeRange: 'last-30m' } as const;
  const window = { from: 1000, to: 2000 };
  for (const traceId of [null, '', 'bad', validId.toUpperCase(), ` ${validId}`]) {
    expect(traceAction({ ...row, traceId }, query, window, open)).toBeUndefined();
  }
  traceAction({ ...row, traceId: validId }, query, window, open)?.();
  expect(open).toHaveBeenCalledTimes(1);
  expect(open.mock.calls[0]?.[0]).toContain(`traceId=${validId}`);
});
