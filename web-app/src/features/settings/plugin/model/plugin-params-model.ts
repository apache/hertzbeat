/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  canonicalCheckbox,
  canonicalCheckboxValues,
  canonicalRadio,
  decodeParamValue,
  encodeParamValue,
  PluginParamCodecError,
  pluginNumberRange,
  validOptions
} from './plugin-params-codec';
import type {
  PasswordDraft,
  PluginParam,
  PluginParamDefine,
  PluginParamDraft,
  PluginParamWrite
} from './plugin-params-contract';

export * from './plugin-params-contract';
export { decodeParamValue, encodeParamValue, PluginParamCodecError, pluginNumberRange } from './plugin-params-codec';
export { invalidPluginParamFields } from './plugin-params-validation';

export function buildPluginParamDraft(
  pluginMetadataId: number,
  defines: readonly PluginParamDefine[],
  params: readonly PluginParam[]
): PluginParamDraft {
  const current = new Map(params.map(param => [param.field, param]));
  const values: Record<string, unknown> = {};
  const passwords: Record<string, PasswordDraft> = {};
  defines.forEach(define => initializeDraftField(define, current.get(define.field), values, passwords));
  return { pluginMetadataId, defines, values, passwords };
}

function initializeDraftField(
  define: PluginParamDefine,
  param: PluginParam | undefined,
  values: Record<string, unknown>,
  passwords: Record<string, PasswordDraft>
) {
  if (define.type === 'password') {
    passwords[define.field] = passwordDraft(define, param);
    return;
  }
  const wireValue = param?.value ?? define.defaultValue;
  const decoded = decodeParamValue(define.type, wireValue);
  if (wireValue !== undefined && isChoice(define) && !validOptions(define, decoded)) throw new PluginParamCodecError();
  values[define.field] = canonicalValue(define, decoded, wireValue !== undefined);
  if (define.type === 'number' && define.range) pluginNumberRange(define.range);
}

function passwordDraft(define: PluginParamDefine, param?: PluginParam): PasswordDraft {
  return {
    intent: param?.configured ? 'KEEP' : define.required ? 'REPLACE' : 'CLEAR',
    value: '',
    canKeep: Boolean(param?.configured)
  };
}
function isChoice(define: PluginParamDefine) {
  return define.type === 'radio' || define.type === 'checkbox';
}
function canonicalValue(define: PluginParamDefine, value: unknown, configured: boolean) {
  if (!configured) return value;
  if (define.type === 'radio') return canonicalRadio(define, value);
  if (define.type === 'checkbox') return canonicalCheckboxValues(define, value);
  return value;
}

export function isPluginParamVisible(define: PluginParamDefine, values: Record<string, unknown>) {
  if (define.hide) return false;
  return Object.entries(define.depend).every(([field, allowed]) => allowed.includes(values[field]));
}

export function buildPluginParamPayload(draft: PluginParamDraft) {
  // Angular submitted every defined field even while a dependency hid it. Preserve that backend contract;
  // visibility must never silently clear or discard a stored value.
  const params = draft.defines.flatMap<PluginParamWrite>(define => {
    if (define.type !== 'password') {
      const value =
        define.type === 'checkbox'
          ? canonicalCheckbox(define, draft.values[define.field])
          : encodeParamValue(define.type, draft.values[define.field]);
      return [{ field: define.field, value }];
    }
    const password = draft.passwords[define.field] ?? { intent: 'CLEAR' as const, value: '', canKeep: false };
    return [
      password.intent === 'REPLACE'
        ? { field: define.field, intent: 'REPLACE', value: password.value }
        : { field: define.field, intent: password.intent }
    ];
  });
  return { pluginMetadataId: draft.pluginMetadataId, params };
}

export function localizedPluginParamName(define: PluginParamDefine, locale: string) {
  const exact = Object.entries(define.name).find(([key]) => key.toLowerCase() === locale.toLowerCase())?.[1];
  return exact ?? define.name['en-US'] ?? Object.values(define.name)[0] ?? define.field;
}
