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

const JAVA_LONG_MAX = '9223372036854775807';

export function normalizeOpaqueId(value: string | undefined) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error('Investigation identity is invalid');
  const normalized = value.trim();
  if (!normalized || normalized.length > 256 || hasControlCharacter(normalized)) {
    throw new Error('Investigation identity is invalid');
  }
  return normalized;
}

export function normalizePositiveId(value: string | undefined) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error('Investigation identity is invalid');
  const normalized = value.trim();
  if (!isPositiveJavaLong(normalized)) throw new Error('Investigation identity is invalid');
  return normalized;
}

export function isPositiveJavaLong(value: string) {
  return (
    /^[1-9]\d{0,18}$/u.test(value) &&
    (value.length < JAVA_LONG_MAX.length || (value.length === JAVA_LONG_MAX.length && value <= JAVA_LONG_MAX))
  );
}

export function requireRecord(
  value: unknown,
  allowedKeys: readonly string[]
): asserts value is Record<string, unknown> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Investigation evidence must be a record');
  }
  if (Object.keys(value).some(key => !allowedKeys.includes(key))) {
    throw new Error('Investigation evidence contains unsupported fields');
  }
}

function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}
