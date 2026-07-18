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

import { MonitorContractError } from './monitor-contract';

export { MonitorContractError } from './monitor-contract';

export function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new MonitorContractError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new MonitorContractError(`${label} must be an array`);
  return value;
}

export function nonemptyString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new MonitorContractError(`${label} must be a nonempty string`);
  }
  return value;
}

export function nullableString(value: unknown, label: string) {
  if (value === null) return null;
  if (typeof value !== 'string') throw new MonitorContractError(`${label} must be a string or null`);
  return value;
}

export function nullableStringMap(value: unknown, label: string) {
  if (value === null) return null;
  const values = record(value, label);
  for (const [entryKey, entryValue] of Object.entries(values)) {
    if (typeof entryValue !== 'string') throw new MonitorContractError(`${label} ${entryKey} must be a string`);
  }
  return values as Record<string, string>;
}

export function nonnegativeInteger(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new MonitorContractError(`${label} must be a nonnegative safe integer`);
  }
  return value;
}

export function nullableNonnegativeInteger(value: unknown, label: string) {
  return value === null ? null : nonnegativeInteger(value, label);
}

export function nullablePositiveInteger(value: unknown, label: string) {
  return value === null ? null : positiveInteger(value, label);
}

export function nullableTimestamp(value: unknown, label: string) {
  if (value === null) return null;
  if ((typeof value !== 'number' || !Number.isFinite(value)) && typeof value !== 'string') {
    throw new MonitorContractError(`${label} must be a finite number, string, or null`);
  }
  return value;
}

export function positiveInteger(value: unknown, label: string) {
  const parsed = nonnegativeInteger(value, label);
  if (parsed === 0) throw new MonitorContractError(`${label} must be positive`);
  return parsed;
}

export function byte(value: unknown, label: string) {
  const parsed = nonnegativeInteger(value, label);
  if (parsed > 255) throw new MonitorContractError(`${label} must fit a byte`);
  return parsed;
}

export function boolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') throw new MonitorContractError(`${label} must be a boolean`);
  return value;
}

export function optionalTimestamp(item: Record<string, unknown>, key: 'gmtCreate' | 'gmtUpdate') {
  const value = item[key];
  if (value === undefined || value === null) return {};
  if ((typeof value !== 'number' || !Number.isFinite(value)) && typeof value !== 'string') {
    throw new MonitorContractError(`${key} must be a finite number, string, or null`);
  }
  return { [key]: value };
}
