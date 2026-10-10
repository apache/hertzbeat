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

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { monitorEditorBackendDiagnostic } from './monitor-editor-api-failure';

describe('monitorEditorBackendDiagnostic', () => {
  it.each([
    'Public Key Retrieval is not allowed',
    'Connection refused',
    'HTTP 401 Unauthorized',
    'SNMP request timed out'
  ])('returns diagnostics deliberately published by the HertzBeat API: %s', diagnostic => {
    expect(monitorEditorBackendDiagnostic(new ApiMessageError(diagnostic, { code: 15, status: 200 }))).toBe(diagnostic);
  });

  it.each([
    new Error('private client detail'),
    new ApiMessageError('transport detail', { cause: new Error('socket detail') }),
    new ApiMessageError('HTTP detail', { status: 500 }),
    new ApiMessageError('invalid envelope', { status: 200 })
  ])('does not expose transport, client, or invalid-envelope details', error => {
    expect(monitorEditorBackendDiagnostic(error)).toBeUndefined();
  });
});
