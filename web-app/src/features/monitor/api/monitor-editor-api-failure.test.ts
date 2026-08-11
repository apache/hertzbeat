/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
