/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const table = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    Table: (props: unknown) => {
      table.capture(props);
      return null;
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

  it('does not publish a fake zero total while the collection is loading', () => {
    render(
      <NoticeReceiverResults
        state={{ kind: 'loading' }}
        busy={false}
        pageIndex={0}
        pageSize={8}
        edit={vi.fn()}
        remove={vi.fn()}
        onPageChange={vi.fn()}
      />
    );

    const props = table.capture.mock.lastCall?.[0] as { pagination: { total?: number } };
    expect(props.pagination).not.toHaveProperty('total');
  });
});
