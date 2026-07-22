/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { pluginNumberRange, validOptions } from './plugin-params-codec';
import type { PluginParamDefine, PluginParamDraft } from './plugin-params-contract';

export function invalidPluginParamFields(draft: PluginParamDraft) {
  return draft.defines.filter(define => !validValue(define, draft)).map(define => define.field);
}

function validValue(define: PluginParamDefine, draft: PluginParamDraft) {
  if (define.type === 'password') return validPassword(define, draft);
  const value = draft.values[define.field];
  if (!validTypeValue(define, value)) return false;
  if (!define.required) return true;
  return validRequiredValue(define, value);
}

function validTypeValue(define: PluginParamDefine, value: unknown) {
  if (define.type === 'radio' || define.type === 'checkbox')
    return emptyChoice(define, value) || validOptions(define, value);
  if (define.type === 'array') return Array.isArray(value) && value.every(item => validArrayItem(item));
  if (define.type === 'number') return value == null || inRange(value, define.range);
  if (define.type === 'metrics-field') return emptyArray(value) || validMetrics(value);
  if (define.type === 'key-value') return emptyArray(value) || validKeyValues(value);
  return true;
}

function emptyChoice(define: PluginParamDefine, value: unknown) {
  return (define.type === 'radio' && value === '') || (define.type === 'checkbox' && emptyArray(value));
}

function validRequiredValue(define: PluginParamDefine, value: unknown) {
  if (value == null || value === '') return false;
  if (isTextType(define) && typeof value === 'string') return Boolean(value.trim());
  if (define.type === 'metrics-field') return validMetrics(value);
  if (define.type === 'key-value') return validKeyValues(value);
  return !Array.isArray(value) || value.length > 0;
}

function validArrayItem(value: unknown) {
  return typeof value === 'string' && Boolean(value.trim()) && !value.includes(',');
}
function emptyArray(value: unknown) {
  return Array.isArray(value) && value.length === 0;
}
function isTextType(define: PluginParamDefine) {
  return define.type === 'text' || define.type === 'textarea' || define.type === 'host';
}

function validPassword(define: PluginParamDefine, draft: PluginParamDraft) {
  const value = draft.passwords[define.field];
  if (!value || (value.intent === 'KEEP' && !value.canKeep)) return false;
  if (value.intent === 'REPLACE' && !value.value.trim()) return false;
  return !define.required || value.intent !== 'CLEAR';
}
function inRange(value: unknown, range?: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (!range) return true;
  const parsed = pluginNumberRange(range);
  return value >= parsed.min && value <= parsed.max;
}
function validMetrics(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return false;
  const fields = value.map(row => (isRecord(row) && typeof row.field === 'string' ? row.field.trim() : ''));
  return (
    new Set(fields).size === fields.length &&
    value.every(
      row =>
        isRecord(row) &&
        typeof row.field === 'string' &&
        Boolean(row.field.trim()) &&
        typeof row.unit === 'string' &&
        Boolean(row.unit.trim()) &&
        (row.type === 0 || row.type === 1)
    )
  );
}
function validKeyValues(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return false;
  const keys = value.map(row => (isRecord(row) && typeof row.key === 'string' ? row.key.trim() : ''));
  return (
    new Set(keys).size === keys.length &&
    value.every(
      row =>
        isRecord(row) &&
        typeof row.key === 'string' &&
        Boolean(row.key.trim()) &&
        typeof row.value === 'string' &&
        Boolean(row.value.trim())
    )
  );
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
