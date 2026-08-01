/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { PluginList } from './plugin-list';

describe('PluginList', () => {
  afterEach(cleanup);

  it('renders an explicit unknown value when parameter count is absent', () => {
    render(
      <PluginList
        records={[{ id: 11, name: 'audit', enableStatus: true }]}
        total={1}
        query={{ search: '', pageIndex: 0, pageSize: 8 }}
        pageSizes={[8]}
        selectedIds={[]}
        canWrite={false}
        busy={false}
        onSelected={vi.fn()}
        onPage={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onConfigure={vi.fn()}
      />
    );

    expect(screen.getByText('plugins.unknown')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'plugins.configureParams' })).not.toBeInTheDocument();
  });

  it('offers writable configuration only for a positive known parameter count', () => {
    const onConfigure = vi.fn();
    render(
      <PluginList
        records={[{ id: 11, name: 'audit', enableStatus: true, paramCount: 2 }]}
        total={1}
        query={{ search: '', pageIndex: 0, pageSize: 8 }}
        pageSizes={[8]}
        selectedIds={[]}
        canWrite
        busy={false}
        onSelected={vi.fn()}
        onPage={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onConfigure={onConfigure}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'plugins.configureParams' }));
    expect(onConfigure).toHaveBeenCalledWith(expect.objectContaining({ id: 11 }));
  });

  it('keeps actions reachable inside a horizontally scrollable table', () => {
    render(
      <PluginList
        records={[{ id: 11, name: 'audit', enableStatus: true, paramCount: 2 }]}
        total={1}
        query={{ search: '', pageIndex: 0, pageSize: 8 }}
        pageSizes={[8]}
        selectedIds={[]}
        canWrite
        busy={false}
        onSelected={vi.fn()}
        onPage={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onConfigure={vi.fn()}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'common.actions' })).toHaveClass('ant-table-cell-fix-right');
  });
});
