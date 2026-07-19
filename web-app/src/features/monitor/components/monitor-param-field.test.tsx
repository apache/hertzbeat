/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import type { MonitorParamDefine } from '../model/monitor-contract';
import { MonitorParamField } from './monitor-param-field';

const define = (field: string, type: string, patch: Partial<MonitorParamDefine> = {}): MonitorParamDefine => ({
  id: null,
  app: 'website',
  field,
  name: { 'en-US': field },
  type,
  required: false,
  defaultValue: null,
  placeholder: null,
  range: null,
  limit: null,
  options: null,
  keyAlias: null,
  valueAlias: null,
  depend: null,
  hide: false,
  ...patch
});
const mapLabels = {
  add: 'Add pair',
  remove: 'Remove pair',
  key: 'Key',
  value: 'Value',
  emptyError: 'A key is required',
  duplicateError: 'Keys must be unique'
};
const metricsLabels = { ...mapLabels, unit: 'Unit', type: 'Type', numberType: 'Number', stringType: 'String' };

afterEach(cleanup);

describe('MonitorParamField', () => {
  it('masks passwords and renders authoritative radio options', () => {
    const password = render(
      <MonitorParamField
        define={define('token', 'password')}
        label="Token"
        value="secret"
        onChange={vi.fn()}
        mapLabels={mapLabels}
        metricsLabels={metricsLabels}
      />
    );
    expect(screen.getByLabelText('Token')).toHaveAttribute('type', 'password');
    password.unmount();

    render(
      <MonitorParamField
        define={define('mode', 'radio', {
          options: [
            { label: 'Basic', value: 'basic' },
            { label: 'Token', value: 'token' }
          ]
        })}
        label="Mode"
        value="basic"
        onChange={vi.fn()}
        mapLabels={mapLabels}
        metricsLabels={metricsLabels}
      />
    );
    expect(screen.getByRole('radio', { name: 'Basic' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Token' })).toBeInTheDocument();
  });

  it('keeps array values comma-delimited and edits key-value objects structurally', () => {
    const arrayChange = vi.fn();
    const view = render(
      <MonitorParamField
        define={define('codes', 'array')}
        label="Codes"
        value="200, 201"
        onChange={arrayChange}
        mapLabels={mapLabels}
        metricsLabels={metricsLabels}
      />
    );
    fireEvent.change(screen.getByLabelText('Codes'), { target: { value: '200, 204' } });
    expect(arrayChange).toHaveBeenCalledWith('200, 204');
    view.unmount();

    const mapChange = vi.fn();
    const validity = vi.fn();
    render(
      <MonitorParamField
        define={define('headers', 'key-value')}
        label="Headers"
        value=""
        onChange={mapChange}
        onValidityChange={validity}
        mapLabels={mapLabels}
        metricsLabels={metricsLabels}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add pair' }));
    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'Accept' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'text' } });
    expect(mapChange).toHaveBeenCalledWith({ Accept: 'text' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove pair' }));
    expect(mapChange).toHaveBeenLastCalledWith('');
  });

  it('reports duplicate keys without overwriting the last valid map', () => {
    const change = vi.fn();
    const validity = vi.fn();
    render(
      <MonitorParamField
        define={define('headers', 'key-value')}
        label="Headers"
        value={{ Accept: 'json' }}
        onChange={change}
        onValidityChange={validity}
        mapLabels={mapLabels}
        metricsLabels={metricsLabels}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add pair' }));
    fireEvent.change(screen.getAllByLabelText('Key')[1]!, { target: { value: 'Accept' } });
    expect(validity).toHaveBeenLastCalledWith(false);
    expect(change).not.toHaveBeenCalledWith({ Accept: '' });
    expect(screen.getByRole('alert')).toHaveTextContent('Keys must be unique');
  });

  it('edits structured push metric rows and rejects duplicate fields', () => {
    const change = vi.fn();
    const validity = vi.fn();
    render(
      <MonitorParamField
        define={define('fields', 'metrics-field')}
        label="Metrics"
        value={[]}
        onChange={change}
        onValidityChange={validity}
        mapLabels={mapLabels}
        metricsLabels={metricsLabels}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add pair' }));
    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'latency' } });
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'ms' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }));
    fireEvent.click(screen.getByText('Number'));
    expect(change).toHaveBeenCalledWith([{ field: 'latency', unit: 'ms', type: 0 }]);
  });

  it('preserves existing metric label and i18n metadata while editing a visible field', () => {
    const change = vi.fn();
    render(
      <MonitorParamField
        define={define('fields', 'metrics-field')}
        label="Metrics"
        value={[{ field: 'latency', unit: 'ms', type: 0, label: true, i18n: { 'en-US': 'Latency' } }]}
        onChange={change}
        mapLabels={mapLabels}
        metricsLabels={metricsLabels}
      />
    );
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'seconds' } });
    expect(change).toHaveBeenCalledWith([
      {
        field: 'latency',
        unit: 'seconds',
        type: 0,
        label: true,
        i18n: { 'en-US': 'Latency' }
      }
    ]);
  });

  it('commits canonical trimmed metric field and unit values', () => {
    const change = vi.fn();
    render(
      <MonitorParamField
        define={define('fields', 'metrics-field')}
        label="Metrics"
        value={[{ field: ' latency ', unit: ' ms ', type: 0 }]}
        onChange={change}
        mapLabels={mapLabels}
        metricsLabels={metricsLabels}
      />
    );
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: ' seconds ' } });
    expect(change).toHaveBeenLastCalledWith([{ field: 'latency', unit: 'seconds', type: 0 }]);
  });

  it('allows an optional metric field to be cleared without retaining stale rows', () => {
    const change = vi.fn();
    const validity = vi.fn();
    render(
      <MonitorParamField
        define={define('fields', 'metrics-field')}
        label="Metrics"
        value={[{ field: 'latency', unit: 'ms', type: 0 }]}
        onChange={change}
        onValidityChange={validity}
        mapLabels={mapLabels}
        metricsLabels={metricsLabels}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove pair' }));

    expect(validity).toHaveBeenLastCalledWith(true);
    expect(change).toHaveBeenLastCalledWith(null);
  });
});
