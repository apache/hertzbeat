/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Checkbox, Input, InputNumber, Radio, Select, Switch } from 'antd';
import type { TFunction } from 'i18next';

import { pluginNumberRange, type PasswordDraft, type PluginParamDefine } from '../model/plugin-params-model';
import { KeyValueRows, MetricRows } from './plugin-param-rows';

export function PluginParamField(props: {
  define: PluginParamDefine;
  value: unknown;
  password?: PasswordDraft;
  t: TFunction;
  onChange: (value: unknown) => void;
  onPassword: (value: PasswordDraft) => void;
}) {
  const { define } = props;
  const specialized = specializedField(props);
  if (specialized) return specialized;
  const text = typeof props.value === 'string' ? props.value : JSON.stringify(props.value ?? '', null, 2);
  const onText = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    props.onChange(event.target.value);
  if (define.type === 'textarea')
    return (
      <Input.TextArea
        rows={6}
        value={text}
        maxLength={define.limit}
        placeholder={define.placeholder}
        onChange={onText}
      />
    );
  if (define.type === 'text' || define.type === 'host')
    return <Input value={text} maxLength={define.limit} placeholder={define.placeholder} onChange={onText} />;
  return unsupportedType(define.type);
}

function specializedField(props: Parameters<typeof PluginParamField>[0]) {
  const { define } = props;
  if (define.type === 'password')
    return <PasswordField {...props} password={props.password ?? { intent: 'CLEAR', value: '', canKeep: false }} />;
  if (define.type === 'boolean') return <Switch checked={props.value === true} onChange={props.onChange} />;
  if (define.type === 'number') return <NumberField define={define} value={props.value} onChange={props.onChange} />;
  if (define.type === 'radio' || define.type === 'checkbox' || define.type === 'array')
    return <ChoiceField define={define} value={props.value} onChange={props.onChange} />;
  if (define.type === 'key-value')
    return (
      <KeyValueRows
        value={props.value}
        keyLabel={define.keyAlias ?? props.t('plugins.params.key')}
        valueLabel={define.valueAlias ?? props.t('plugins.params.value')}
        t={props.t}
        onChange={props.onChange}
      />
    );
  if (define.type === 'metrics-field') return <MetricRows value={props.value} t={props.t} onChange={props.onChange} />;
  return null;
}

function ChoiceField(props: { define: PluginParamDefine; value: unknown; onChange: (value: unknown) => void }) {
  if (props.define.type === 'radio') {
    return (
      <Radio.Group
        value={props.value}
        options={[...props.define.options]}
        onChange={event => props.onChange(event.target.value as unknown)}
      />
    );
  }
  const values = Array.isArray(props.value) ? (props.value as string[]) : [];
  if (props.define.type === 'checkbox') {
    return <Checkbox.Group value={values} options={[...props.define.options]} onChange={props.onChange} />;
  }
  return <Select mode="tags" value={values} onChange={props.onChange} />;
}

function PasswordField(props: {
  define: PluginParamDefine;
  password: PasswordDraft;
  t: TFunction;
  onPassword: (value: PasswordDraft) => void;
}) {
  return (
    <div>
      <Radio.Group
        value={props.password.intent}
        options={(['KEEP', 'REPLACE', 'CLEAR'] as const)
          .filter(
            value => (value !== 'KEEP' || props.password.canKeep) && (value !== 'CLEAR' || !props.define.required)
          )
          .map(value => ({
            value,
            label: props.t(`plugins.params.password.${value.toLowerCase()}`)
          }))}
        onChange={event =>
          props.onPassword({
            intent: event.target.value as PasswordDraft['intent'],
            value: '',
            canKeep: props.password.canKeep
          })
        }
      />
      {props.password.intent === 'REPLACE' && (
        <Input.Password
          autoComplete="new-password"
          value={props.password.value}
          onChange={event =>
            props.onPassword({ intent: 'REPLACE', value: event.target.value, canKeep: props.password.canKeep })
          }
        />
      )}
    </div>
  );
}

function NumberField(props: { define: PluginParamDefine; value: unknown; onChange: (value: unknown) => void }) {
  const range = props.define.range ? pluginNumberRange(props.define.range) : undefined;
  return (
    <InputNumber value={typeof props.value === 'number' ? props.value : null} {...range} onChange={props.onChange} />
  );
}

function unsupportedType(value: PluginParamDefine['type']): never {
  throw new Error(`Unsupported plugin parameter type: ${String(value)}`);
}
