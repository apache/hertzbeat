/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
