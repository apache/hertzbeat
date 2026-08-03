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

import { Input, InputNumber, Radio, Switch } from 'antd';
import type { ReactNode } from 'react';

import type { LabelSuggestionCatalog } from '@/shared/labels/label-suggestion-model';

import type { MonitorParamDefine } from '../model/monitor-contract';
import type { MonitorParamFormValue } from '../model/monitor-editor-model';
import { numberDefineRange } from '../model/monitor-param-codec';
import { KeyValueField, type RowEditorLabels } from './monitor-key-value-field';
import { MetricsField, type MetricsEditorLabels } from './monitor-metrics-field';

type MonitorParamFieldProps = {
  define: MonitorParamDefine;
  label: ReactNode;
  ariaLabel?: string;
  value: MonitorParamFormValue;
  onChange: (value: MonitorParamFormValue) => void;
  onValidityChange?: (valid: boolean) => void;
  mapLabels: RowEditorLabels;
  mapSuggestions?: LabelSuggestionCatalog;
  metricsLabels: MetricsEditorLabels;
  disabled?: boolean;
  invalid?: boolean;
};

export function MonitorParamField({
  define,
  label,
  ariaLabel,
  value,
  onChange,
  onValidityChange,
  mapLabels,
  mapSuggestions,
  metricsLabels,
  disabled = false,
  invalid = false
}: MonitorParamFieldProps) {
  const props = { define, label, value, onChange, disabled, invalid, ...(ariaLabel ? { ariaLabel } : {}) };
  if (define.type === 'boolean') return <BooleanField {...props} />;
  if (define.type === 'number') return <NumberField {...props} />;
  if (define.type === 'radio') return <RadioField {...props} />;
  if (define.type === 'key-value') {
    return (
      <KeyValueField
        label={label}
        value={value}
        onChange={onChange}
        {...(onValidityChange ? { onValidityChange } : {})}
        labels={mapLabels}
        {...(mapSuggestions ? { suggestions: mapSuggestions } : {})}
        disabled={disabled}
      />
    );
  }
  if (define.type === 'metrics-field') {
    return (
      <MetricsField
        label={label}
        value={value}
        onChange={onChange}
        {...(onValidityChange ? { onValidityChange } : {})}
        labels={metricsLabels}
        required={define.required}
        disabled={disabled}
      />
    );
  }
  return <TextField {...props} />;
}

type SimpleFieldProps = Pick<MonitorParamFieldProps, 'define' | 'label' | 'ariaLabel' | 'value' | 'onChange'> & {
  disabled: boolean;
  invalid: boolean;
};

function BooleanField({ label, ariaLabel, value, onChange, disabled }: SimpleFieldProps) {
  return (
    <label>
      {label}
      <Switch aria-label={ariaLabel} checked={value === true} disabled={disabled} onChange={onChange} />
    </label>
  );
}

function NumberField({ define, label, ariaLabel, value, onChange, disabled, invalid }: SimpleFieldProps) {
  const range = numberDefineRange(define);
  return (
    <label>
      {label}
      <InputNumber<number>
        aria-label={ariaLabel}
        value={typeof value === 'number' ? value : null}
        disabled={disabled}
        status={invalid ? 'error' : ''}
        {...(range ? { min: range.min, max: range.max } : {})}
        onChange={onChange}
      />
    </label>
  );
}

function RadioField({ define, label, ariaLabel, value, onChange, disabled }: SimpleFieldProps) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <Radio.Group
        aria-label={ariaLabel}
        value={typeof value === 'string' ? value : null}
        disabled={disabled}
        options={define.options ?? []}
        onChange={event => onChange(event.target.value as string)}
      />
    </fieldset>
  );
}

function TextField({ define, label, ariaLabel, value, onChange, disabled, invalid }: SimpleFieldProps) {
  const common = {
    value: typeof value === 'string' ? value : '',
    'aria-label': ariaLabel,
    disabled,
    status: invalid ? ('error' as const) : ('' as const),
    ...(define.placeholder === null ? {} : { placeholder: define.placeholder }),
    ...(define.limit === null ? {} : { maxLength: define.limit }),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value)
  };
  if (define.type === 'password')
    return (
      <label>
        {label}
        <Input.Password {...common} />
      </label>
    );
  if (define.type === 'textarea')
    return (
      <label>
        {label}
        <Input.TextArea {...common} />
      </label>
    );
  return (
    <label>
      {label}
      <Input {...common} />
    </label>
  );
}
