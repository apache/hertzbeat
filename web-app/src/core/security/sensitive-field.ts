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

const SENSITIVE_FIELD_FRAGMENTS = [
  'token',
  'secret',
  'password',
  'authorization',
  'credential',
  'apikey',
  'header',
  'installlog',
  'telemetrybody'
] as const;

export function normalizeSecurityFieldName(fieldName: string) {
  return fieldName
    .normalize('NFKC')
    .replace(/[^a-z0-9]/giu, '')
    .toLowerCase();
}

/** Security boundaries share this conservative vocabulary so separator and case variants cannot bypass one caller. */
export function isSensitiveFieldName(fieldName: string) {
  const normalized = normalizeSecurityFieldName(fieldName);
  return SENSITIVE_FIELD_FRAGMENTS.some(fragment => normalized.includes(fragment));
}
