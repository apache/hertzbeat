/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { KeyValueDraftRow, MetricDraftRow, PluginParamDefine, PluginParamType } from './plugin-params-contract';

export class PluginParamCodecError extends Error {}

export function decodeParamValue(type: PluginParamType, value?: string): unknown {
  if (value === undefined) return emptyValue(type);
  if (type === 'number') return readNumber(value);
  if (type === 'boolean') return readBoolean(value);
  if (type === 'checkbox' || type === 'array') return readCommaList(value);
  if (type === 'key-value') return readKeyValues(value);
  if (type === 'metrics-field') return readMetrics(value);
  return value;
}

export function encodeParamValue(type: PluginParamType, value: unknown) {
  if (type === 'checkbox' || type === 'array')
    return Array.isArray(value) ? value.map(item => stringifyScalar(item).trim()).join(',') : '';
  if (type === 'key-value')
    return JSON.stringify(Object.fromEntries((value as KeyValueDraftRow[]).map(row => [row.key, row.value])));
  if (type === 'metrics-field')
    return JSON.stringify(
      (value as MetricDraftRow[]).map(row => ({ field: row.field, unit: row.unit, type: row.type }))
    );
  if (type === 'boolean') return value === true ? 'true' : 'false';
  return value == null ? '' : stringifyScalar(value);
}

export function validOptions(define: PluginParamDefine, value: unknown) {
  if (define.type === 'radio') return value !== '' && define.options.some(option => equalOption(option.value, value));
  if (!Array.isArray(value) || value.length === 0) return false;
  const normalized = value.map(item => String(item).toLowerCase());
  return (
    new Set(normalized).size === value.length &&
    value.every(item => define.options.some(option => equalOption(option.value, item)))
  );
}

export function canonicalRadio(define: PluginParamDefine, value: unknown) {
  return define.options.find(option => equalOption(option.value, value))?.value ?? '';
}
export function canonicalCheckboxValues(define: PluginParamDefine, value: unknown) {
  return Array.isArray(value)
    ? value.map(item => define.options.find(option => equalOption(option.value, item))?.value ?? '')
    : [];
}
export function canonicalCheckbox(define: PluginParamDefine, value: unknown) {
  return canonicalCheckboxValues(define, value).join(',');
}

export function pluginNumberRange(range: string) {
  const match = /^\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]$/.exec(range.replace(/\s+/g, ''));
  const min = Number(match?.[1]);
  const max = Number(match?.[2]);
  if (!match || !Number.isFinite(min) || !Number.isFinite(max) || min > max) throw new PluginParamCodecError();
  return { min, max };
}

function emptyValue(type: PluginParamType): unknown {
  if (type === 'boolean') return false;
  if (type === 'number') return null;
  if (type === 'key-value' || type === 'metrics-field' || type === 'checkbox' || type === 'array') return [];
  return '';
}
function readNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new PluginParamCodecError();
  return parsed;
}
function readBoolean(value: string) {
  if (value !== 'true' && value !== 'false') throw new PluginParamCodecError();
  return value === 'true';
}
function readCommaList(value: string) {
  if (!value) return [];
  const entries = value.split(',').map(item => item.trim());
  if (entries.some(item => !item)) throw new PluginParamCodecError();
  return entries;
}
function readKeyValues(value: string): KeyValueDraftRow[] {
  const parsed = readJson(value);
  if (!isStringRecord(parsed)) throw new PluginParamCodecError();
  return Object.entries(parsed).map(([key, entry], index) => ({ id: `key-${index}`, key, value: entry }));
}
function readMetrics(value: string): MetricDraftRow[] {
  const parsed = readJson(value);
  if (!Array.isArray(parsed)) throw new PluginParamCodecError();
  return parsed.map((row, index) => {
    if (
      !isRecord(row) ||
      typeof row.field !== 'string' ||
      typeof row.unit !== 'string' ||
      (row.type !== 0 && row.type !== 1)
    )
      throw new PluginParamCodecError();
    return { id: `metric-${index}`, field: row.field, unit: row.unit, type: row.type };
  });
}
function readJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new PluginParamCodecError();
  }
}
function equalOption(option: string, value: unknown) {
  return option.toLowerCase() === stringifyScalar(value).toLowerCase();
}
function stringifyScalar(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  throw new PluginParamCodecError();
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) && Object.entries(value).every(([key, entry]) => Boolean(key.trim()) && typeof entry === 'string')
  );
}
