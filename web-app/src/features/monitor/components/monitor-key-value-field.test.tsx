/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KeyValueField } from './monitor-key-value-field';

afterEach(cleanup);

const labels = {
  add: 'Add',
  remove: 'Remove',
  key: 'Key',
  value: 'Value',
  emptyError: 'Key required',
  duplicateError: 'Duplicate key'
};

describe('KeyValueField label suggestions', () => {
  it('uses dependent autocomplete fields and clears a stale value when its key changes', () => {
    const onChange = vi.fn();
    render(
      <KeyValueField
        label="Labels"
        value={{ env: 'prod' }}
        onChange={onChange}
        labels={labels}
        disabled={false}
        suggestions={{
          keys: ['env', 'region'],
          valuesByKey: { env: ['prod', 'staging'], region: ['east', 'west'] }
        }}
      />
    );

    const keyInput = screen.getByRole('combobox', { name: 'Key' });
    expect(keyInput).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Value' })).toBeInTheDocument();

    fireEvent.change(keyInput, { target: { value: 'region' } });

    expect(onChange).toHaveBeenLastCalledWith({ region: '' });
  });
});
