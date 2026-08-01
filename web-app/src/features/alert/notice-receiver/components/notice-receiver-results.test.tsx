/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const table = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    Table: (props: unknown) => {
      table.capture(props);
      const value = props as {
        columns?: Array<{ render?: (value: unknown, record: unknown) => ReactNode }>;
        dataSource?: unknown[];
      };
      const record = value.dataSource?.[0];
      return record === undefined ? null : value.columns?.at(-1)?.render?.(undefined, record);
    }
  };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { NoticeReceiverResults } from './notice-receiver-results';

describe('NoticeReceiverResults', () => {
  afterEach(() => {
    cleanup();
    table.capture.mockClear();
  });

  it('does not publish a table or fake total while the collection is loading', () => {
    render(
      <NoticeReceiverResults
        actionPolicy={{ canCreate: true, canEdit: true, canTest: true, canDelete: true }}
        state={{ kind: 'loading' }}
        busy={false}
        pageIndex={0}
        pageSize={8}
        edit={vi.fn()}
        remove={vi.fn()}
        retry={vi.fn()}
        onPageChange={vi.fn()}
      />
    );

    expect(table.capture).not.toHaveBeenCalled();
    expect(document.querySelector('[data-state="loading"]')).toHaveTextContent('noticeReceivers.loading');
  });

  it('locks pagination while a command or recovery owns the list', () => {
    render(
      <NoticeReceiverResults
        actionPolicy={{ canCreate: true, canEdit: true, canTest: true, canDelete: true }}
        state={{
          kind: 'ready',
          records: [{ id: 7, name: 'Pager', type: 2, typeKey: 'webhook', options: {}, configuredSecrets: [] }],
          total: 9
        }}
        busy
        pageIndex={0}
        pageSize={8}
        edit={vi.fn()}
        remove={vi.fn()}
        retry={vi.fn()}
        onPageChange={vi.fn()}
      />
    );
    const props = table.capture.mock.lastCall?.[0] as { pagination: { disabled?: boolean } };
    expect(props.pagination.disabled).toBe(true);
  });

  it('locks an already-open delete confirmation when recovery takes ownership', async () => {
    const remove = vi.fn();
    const record = {
      id: 7,
      name: 'Pager',
      type: 2 as const,
      typeKey: 'webhook',
      options: {},
      configuredSecrets: []
    };
    const page = render(
      <NoticeReceiverResults
        actionPolicy={{ canCreate: true, canEdit: true, canTest: true, canDelete: true }}
        state={{ kind: 'ready', records: [record], total: 1 }}
        busy={false}
        pageIndex={0}
        pageSize={8}
        edit={vi.fn()}
        remove={remove}
        retry={vi.fn()}
        onPageChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'noticeReceivers.delete' }));
    const confirm = await screen.findByRole('button', { name: 'OK' });

    page.rerender(
      <NoticeReceiverResults
        actionPolicy={{ canCreate: true, canEdit: true, canTest: true, canDelete: true }}
        state={{ kind: 'ready', records: [record], total: 1 }}
        busy
        pageIndex={0}
        pageSize={8}
        edit={vi.fn()}
        remove={remove}
        retry={vi.fn()}
        onPageChange={vi.fn()}
      />
    );

    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(remove).not.toHaveBeenCalled();
  });
});
