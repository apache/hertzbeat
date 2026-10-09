/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import type { LogExploreQuery } from '../model/explore-model';
import type { LogColumn, LogColumnControls } from '../model/explore-log-columns';
import { logRowSelection } from './explore-log-row-selection';

const query = { query: '', timeZone: 'UTC', sort: 'newest', live: false } as LogExploreQuery;
const t = ((key: string, options?: { field?: string }) =>
  options?.field ? `${key}:${options.field}` : key) as TFunction;

describe('log row column actions', () => {
  it('keeps the visible first field reorderable when Date is hidden', () => {
    const onColumnsChange = vi.fn();
    const controls: LogColumnControls = {
      columns: [{ kind: 'service' }, { kind: 'severity' }, { kind: 'message' }],
      onColumnsChange
    };
    const selection = logRowSelection([], query, { showTime: false }, undefined, 'inspector', vi.fn(), t, controls);
    const [service, severity] = selection.columns;

    expect(service?.actions?.moveLeftDisabled).toBe(true);
    expect(service?.actions?.moveRightDisabled).toBe(false);
    selection.onColumnMove?.(service!.id, 'right');
    expect(onColumnsChange).toHaveBeenCalledWith([{ kind: 'severity' }, { kind: 'service' }, { kind: 'message' }]);
    expect(severity?.id).not.toBe(service?.id);
  });

  it('removes Date and Content through display preferences while retaining their descriptors', () => {
    const onColumnsChange = vi.fn();
    const onShowTimeChange = vi.fn();
    const onShowContentChange = vi.fn();
    const controls: LogColumnControls = {
      columns: [{ kind: 'time' }, { kind: 'message' }],
      onColumnsChange
    };
    const selection = logRowSelection(
      [],
      query,
      { onShowTimeChange, onShowContentChange },
      undefined,
      'inspector',
      vi.fn(),
      t,
      controls
    );
    selection.columns[0]?.actions?.onAction('remove');
    selection.columns[1]?.actions?.onAction('remove');

    expect(onShowTimeChange).toHaveBeenCalledWith(false);
    expect(onShowContentChange).toHaveBeenCalledWith(false);
    expect(onColumnsChange).not.toHaveBeenCalled();
  });

  it('offers header Calculate only for a top-level resource or attribute field', () => {
    const columns: LogColumn[] = [
      { kind: 'field', scope: 'resource', path: ['host.name'] },
      { kind: 'field', scope: 'attributes', path: ['event.name'] },
      { kind: 'field', scope: 'resource', path: ['host', 'name'] },
      { kind: 'message' }
    ];
    const onCalculateField = vi.fn();
    const selection = logRowSelection(
      [],
      query,
      undefined,
      undefined,
      'inspector',
      vi.fn(),
      t,
      { columns, onColumnsChange: vi.fn() },
      undefined,
      undefined,
      onCalculateField
    );
    expect(selection.columns[0]?.actions?.showCalculate).toBe(true);
    expect(selection.columns[2]?.actions?.showCalculate).toBe(false);
    selection.columns[0]?.actions?.onAction('calculate-field');
    selection.columns[1]?.actions?.onAction('calculate-field');
    expect(onCalculateField).toHaveBeenNthCalledWith(1, 'resource("host.name")');
    expect(onCalculateField).toHaveBeenNthCalledWith(2, '@event.name');
  });
});
