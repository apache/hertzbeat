/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';

import { decodeParamValue, type KeyValueDraftRow, type MetricDraftRow } from '../model/plugin-params-model';
import { KeyValueRows, MetricRows } from './plugin-param-rows';

const t = ((key: string) => key) as TFunction;

describe('plugin structured parameter rows', () => {
  afterEach(cleanup);
  it('preserves duplicate and empty key drafts by stable row identity', () => {
    function Harness() {
      const [value, setValue] = useState<KeyValueDraftRow[]>([
        { id: 'a', key: '', value: '' },
        { id: 'b', key: '', value: '' }
      ]);
      return (
        <KeyValueRows
          value={value}
          keyLabel="key alias"
          valueLabel="value alias"
          t={t}
          onChange={next => setValue(next as KeyValueDraftRow[])}
        />
      );
    }
    render(<Harness />);
    expect(screen.getAllByRole('textbox', { name: 'key alias' })).toHaveLength(2);
    fireEvent.change(screen.getAllByRole('textbox', { name: 'key alias' })[0]!, { target: { value: 'same' } });
    fireEvent.change(screen.getAllByRole('textbox', { name: 'key alias' })[1]!, { target: { value: 'same' } });
    expect(screen.getAllByRole('textbox', { name: 'key alias' })).toHaveLength(2);
  });

  it('preserves duplicate metric field drafts without discarding either row', () => {
    const value = [
      { id: 'a', field: 'cpu', unit: '%', type: 0 },
      { id: 'b', field: 'cpu', unit: 'ms', type: 1 }
    ];
    render(<MetricRows value={value} t={t} onChange={vi.fn()} />);
    fireEvent.change(screen.getAllByRole('textbox', { name: 'plugins.params.unit' })[0]!, {
      target: { value: 'percent' }
    });
    expect(screen.getAllByRole('textbox', { name: 'plugins.params.field' })).toHaveLength(2);
  });

  it('keeps decoded key rows and newly added rows uniquely and independently addressable', () => {
    function Harness() {
      const [value, setValue] = useState(
        decodeParamValue('key-value', '{"first":"1","second":"2"}') as KeyValueDraftRow[]
      );
      return (
        <>
          <KeyValueRows
            value={value}
            keyLabel="key alias"
            valueLabel="value alias"
            t={t}
            onChange={next => setValue(next as KeyValueDraftRow[])}
          />
          <output data-testid="row-ids">{value.map(row => row.id).join(',')}</output>
        </>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));
    const ids = screen.getByTestId('row-ids').textContent?.split(',') ?? [];
    expect(new Set(ids).size).toBe(3);
    fireEvent.change(screen.getAllByRole('textbox', { name: 'key alias' })[2]!, { target: { value: 'third' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'common.delete' })[1]!);
    expect(screen.getAllByRole('textbox', { name: 'key alias' }).map(input => input.getAttribute('value'))).toEqual([
      'first',
      'third'
    ]);
  });

  it('keeps decoded metric rows and newly added rows uniquely and independently addressable', () => {
    function Harness() {
      const [value, setValue] = useState(
        decodeParamValue(
          'metrics-field',
          '[{"field":"cpu","unit":"%","type":0},{"field":"memory","unit":"MB","type":0}]'
        ) as MetricDraftRow[]
      );
      return (
        <>
          <MetricRows value={value} t={t} onChange={next => setValue(next as MetricDraftRow[])} />
          <output data-testid="metric-row-ids">{value.map(row => row.id).join(',')}</output>
        </>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));
    const ids = screen.getByTestId('metric-row-ids').textContent?.split(',') ?? [];
    expect(new Set(ids).size).toBe(3);
    fireEvent.change(screen.getAllByRole('textbox', { name: 'plugins.params.field' })[2]!, {
      target: { value: 'disk' }
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'common.delete' })[1]!);
    expect(
      screen.getAllByRole('textbox', { name: 'plugins.params.field' }).map(input => input.getAttribute('value'))
    ).toEqual(['cpu', 'disk']);
  });
});
