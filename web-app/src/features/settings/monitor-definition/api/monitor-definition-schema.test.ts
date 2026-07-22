/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  parseMonitorDefinitionCatalog,
  parseMonitorDefinitionDelete,
  parseMonitorDefinitionDetail,
  parseMonitorDefinitionValidation,
  parseMonitorDefinitionValidationRequest,
  parseMonitorDefinitionWriteRequest
} from './monitor-definition-schema';

const revision = 'a'.repeat(64);
const catalogItem = { app: 'mysql', label: 'MySQL', origin: 'override', editable: true, deletable: true, revision };

describe('monitor definition frozen schemas', () => {
  it('accepts only the exact versioned catalog and detail shapes', () => {
    expect(parseMonitorDefinitionCatalog({ schemaVersion: 1, items: [catalogItem] }).items).toEqual([catalogItem]);
    expect(
      parseMonitorDefinitionDetail({
        schemaVersion: 1,
        ...catalogItem,
        definition: 'app: mysql'
      }).definition
    ).toBe('app: mysql');
    expect(() =>
      parseMonitorDefinitionCatalog({ schemaVersion: 1, items: [catalogItem], observedAt: 'private' })
    ).toThrow();
    expect(() =>
      parseMonitorDefinitionDetail({ schemaVersion: 1, ...catalogItem, definition: '', extra: true })
    ).toThrow();
    expect(() =>
      parseMonitorDefinitionCatalog({ schemaVersion: 1, items: [{ ...catalogItem, revision: 'weak' }] })
    ).toThrow();
  });

  it('accepts exact validation/write requests and rejects unknown or inconsistent evidence', () => {
    expect(
      parseMonitorDefinitionValidationRequest({ operation: 'create', expectedApp: null, definition: 'app: custom' })
    ).toEqual({ operation: 'create', expectedApp: null, definition: 'app: custom' });
    expect(
      parseMonitorDefinitionValidationRequest({ operation: 'update', expectedApp: 'mysql', definition: 'app: mysql' })
    ).toEqual({ operation: 'update', expectedApp: 'mysql', definition: 'app: mysql' });
    expect(parseMonitorDefinitionWriteRequest({ definition: 'app: custom' })).toEqual({ definition: 'app: custom' });
    expect(() =>
      parseMonitorDefinitionValidationRequest({ operation: 'create', expectedApp: 'mysql', definition: 'app: mysql' })
    ).toThrow();
    expect(() =>
      parseMonitorDefinitionValidationRequest({ operation: 'update', expectedApp: null, definition: 'app: mysql' })
    ).toThrow();
    expect(() => parseMonitorDefinitionWriteRequest({ definition: 'app: x', app: 'x' })).toThrow();
  });

  it('parses exact validation and both delete dispositions without accepting leaked definitions', () => {
    expect(
      parseMonitorDefinitionValidation({ schemaVersion: 1, valid: true, app: 'custom', origin: 'custom' })
    ).toEqual({ schemaVersion: 1, valid: true, app: 'custom', origin: 'custom' });
    expect(parseMonitorDefinitionDelete({ schemaVersion: 1, app: 'custom', disposition: 'removed' }).disposition).toBe(
      'removed'
    );
    expect(
      parseMonitorDefinitionDelete({ schemaVersion: 1, app: 'mysql', disposition: 'builtin_restored' }).disposition
    ).toBe('builtin_restored');
    expect(() =>
      parseMonitorDefinitionValidation({
        schemaVersion: 1,
        valid: true,
        app: 'custom',
        origin: 'custom',
        definition: 'must-not-leak'
      })
    ).toThrow();
  });
});
