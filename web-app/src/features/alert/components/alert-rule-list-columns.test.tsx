/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';

import { buildAlertRuleListColumns } from './alert-rule-list-columns';
import type { AlertRule } from '../model/alert-rule-model';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);
const expression = 'equals(__app__,"website") && '.repeat(40) + 'response_time > 90';
const rule: AlertRule = {
  id: 7,
  name: 'CPU',
  type: 'realtime_metric',
  datasource: 'promql',
  expr: expression,
  period: 300,
  times: 3,
  labels: {},
  annotations: {},
  template: 'CPU',
  enable: false,
  gmtUpdate: '2026-07-17T09:00:00'
};
const actions = { busy: false, canWrite: true, canDelete: true, edit: vi.fn(), toggle: vi.fn(), remove: vi.fn() };
const t = ((key: string) => key) as TFunction;
it('bounds the expression and keeps identity, enabled status and actions pinned', () => {
  const columns = buildAlertRuleListColumns(t, actions);
  expect(columns[0]?.fixed).toBe('left');
  expect(columns[2]?.width).toBe(280);
  expect(columns.at(-2)?.fixed).toBe('right');
  expect(columns.at(-1)?.fixed).toBe('right');
});
it('opens the complete expression from its focusable trigger without invoking mutations', async () => {
  const column = buildAlertRuleListColumns(t, actions)[2]!;
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      {column.render!(expression, rule, 0) as ReactNode}
    </ConfigProvider>
  );
  const trigger = screen.getByRole('button', { name: 'alertRules.expression: CPU' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(await screen.findByRole('dialog', { name: 'alertRules.expression' })).toBeInTheDocument();
  const input = screen.getByRole('textbox', { name: 'alertRules.expression' });
  expect(input).toHaveValue(expression);
  expect(input).toHaveAttribute('readonly');
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(actions.edit).not.toHaveBeenCalled();
  expect(actions.toggle).not.toHaveBeenCalled();
  expect(actions.remove).not.toHaveBeenCalled();
});
it('keeps a missing expression distinct from an inspectable value', () => {
  const column = buildAlertRuleListColumns(t, actions)[2]!;
  render(<>{column.render!(null, { ...rule, expr: null }, 0) as ReactNode}</>);
  expect(screen.getByText('—')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
