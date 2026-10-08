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

import { AutoComplete, Input, Select } from 'antd';
import { useId, useState } from 'react';
import styles from './explore-log-query-builder.module.css';

export function TextField({
  label,
  placeholder,
  value,
  onChange,
  suggestions,
  suggestionStatus
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[] | undefined;
  suggestionStatus?: string | undefined;
}) {
  const suggestionsId = useId();
  const [open, setOpen] = useState(false);
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {suggestions ? (
        <AutoComplete
          aria-label={label}
          aria-describedby={suggestionStatus ? `${suggestionsId}-status` : undefined}
          value={value}
          placeholder={placeholder}
          options={suggestions.map(option => ({ value: option }))}
          open={open}
          onFocus={() => setOpen(true)}
          onOpenChange={setOpen}
          onChange={next => onChange(next)}
          filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      ) : (
        <Input
          aria-label={label}
          value={value}
          placeholder={placeholder}
          onChange={event => onChange(event.target.value)}
        />
      )}
      {suggestionStatus && (
        <small id={`${suggestionsId}-status`} role="status">
          {suggestionStatus}
        </small>
      )}
    </label>
  );
}

export function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange
}: {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  return (
    <label className={styles.field}>
      <span id={labelId}>{label}</span>
      <Select
        aria-labelledby={labelId}
        allowClear
        value={value || undefined}
        placeholder={placeholder}
        options={options.map(option => ({ value: option, label: option }))}
        onChange={nextValue => onChange(nextValue ?? '')}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  placeholder,
  value,
  invalid,
  onChange
}: {
  label: string;
  placeholder: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <Input.TextArea
        aria-label={label}
        aria-invalid={invalid || undefined}
        autoSize={{ minRows: 1, maxRows: 3 }}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}
