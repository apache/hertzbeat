/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAuthoritativePageSelection } from './authoritative-page-selection';

type Row = { id: number };
const ready = (ids: number[]) => ({ kind: 'ready' as const, records: ids.map(id => ({ id })), total: ids.length });

describe('authoritative page selection', () => {
  it('keeps only unique visible IDs for the active scope', () => {
    const view = renderHook(
      ({ scope, source }: { scope: string; source: ReturnType<typeof ready> }) =>
        useAuthoritativePageSelection<Row>(scope, source),
      { initialProps: { scope: 'page=0', source: ready([7, 8]) } }
    );

    act(() => view.result.current.selectIds([8, 7, 8, 99]));
    expect(view.result.current.selectedIds).toEqual([7, 8]);
    view.rerender({ scope: 'page=1', source: ready([9]) });
    expect(view.result.current.selectedIds).toEqual([]);
  });

  it('does not revive a selection after a fresh authoritative projection', () => {
    const view = renderHook(
      ({ source }: { source: ReturnType<typeof ready> }) => useAuthoritativePageSelection<Row>('page=0', source),
      { initialProps: { source: ready([7, 8]) } }
    );

    act(() => view.result.current.selectIds([7]));
    view.rerender({ source: ready([8]) });
    expect(view.result.current.selectedIds).toEqual([]);
    view.rerender({ source: ready([7, 8]) });
    expect(view.result.current.selectedIds).toEqual([]);
  });

  it('keeps selection when a parent rerender only rebuilds the view-state wrapper', () => {
    const records = [{ id: 7 }, { id: 8 }];
    const view = renderHook(
      ({ source }: { source: ReturnType<typeof ready> }) => useAuthoritativePageSelection<Row>('page=0', source),
      { initialProps: { source: { kind: 'ready' as const, records, total: records.length } } }
    );

    act(() => view.result.current.selectIds([7]));
    view.rerender({ source: { kind: 'ready', records, total: records.length } });

    expect(view.result.current.selectedIds).toEqual([7]);
  });
});
