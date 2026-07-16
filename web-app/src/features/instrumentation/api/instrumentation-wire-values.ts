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

import { INSTRUMENTATION_SCHEMA_VERSION } from './instrumentation-contract';

export class InstrumentationContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstrumentationContractError';
  }
}

export function schemaRecord(value: unknown, label: string) {
  const parsed = record(value, label);
  if (parsed.schemaVersion !== INSTRUMENTATION_SCHEMA_VERSION) contract(`${label} schemaVersion must be 1`);
  return parsed;
}

export function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) contract(`${label} must be an object`);
  return value as Record<string, unknown>;
}

export function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) contract(`${label} must be an array`);
  return value;
}

export function string(value: unknown, label: string) {
  if (typeof value !== 'string' || !value) contract(`${label} must be a non-empty string`);
  return value;
}

export function nullableString(value: unknown, label: string) {
  if (value === null) return null;
  return string(value, label);
}

export function boolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') contract(`${label} must be a boolean`);
  return value;
}

export function positiveNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    contract(`${label} must be a positive epoch millisecond integer`);
  }
  return value;
}

export function nullablePositiveNumber(value: unknown, label: string) {
  if (value === null) return null;
  return positiveNumber(value, label);
}

export function enumValue<const T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) contract(`${label} is unsupported`);
  return value;
}

export function nullableEnumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string
): T[number] | null {
  if (value === null) return null;
  return enumValue(value, allowed, label);
}

export function contract(message: string): never {
  throw new InstrumentationContractError(message);
}
