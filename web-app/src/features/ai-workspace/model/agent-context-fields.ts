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

export function readOptionalText(params: URLSearchParams, key: string, maximum: number) {
  if (!params.has(key)) return undefined;
  const value = params.get(key);
  return value && value === value.trim() && value.length <= maximum && !hasControlCharacter(value) ? value : undefined;
}

export function readOptionalInteger(params: URLSearchParams, key: string, minimum: number, maximum: number) {
  return params.has(key) ? readInteger(params, key, minimum, maximum) : undefined;
}

export function readInteger(params: URLSearchParams, key: string, minimum: number, maximum: number) {
  const value = params.get(key);
  if (value === null || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

export function readBoolean(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function optionalPresent(params: URLSearchParams, key: string, value: unknown) {
  return params.has(key) === (value !== undefined);
}

export function setInteger(params: URLSearchParams, key: string, value: number | undefined) {
  if (value !== undefined && Number.isSafeInteger(value)) params.set(key, String(value));
}

export function setText(params: URLSearchParams, key: string, value: string | undefined) {
  if (value !== undefined) params.set(key, value);
}

export function assign<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined) {
  if (value !== undefined) target[key] = value;
}

export function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
}
