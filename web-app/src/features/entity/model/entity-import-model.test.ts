/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  canConfirmEntityImport,
  changeEntityImportContent,
  changeEntityImportFormat,
  initialEntityImportDraft,
  previewedEntityImport,
  safeEntityImportReturnTo
} from './entity-import-model';

const preview = [{ entity: { type: 'service', name: 'checkout' }, identities: [], monitorBinds: [], relations: [] }];

describe('entity import model', () => {
  it('enables confirmation only for the exact nonblank preview snapshot', () => {
    const drafted = changeEntityImportContent(initialEntityImportDraft, ' kind: service ');
    const ready = previewedEntityImport(drafted, preview);
    expect(canConfirmEntityImport(ready)).toBe(true);
    expect(changeEntityImportContent(ready, 'kind: database').preview).toBeUndefined();
    expect(changeEntityImportFormat(ready, 'json').preview).toBeUndefined();
    expect(canConfirmEntityImport(changeEntityImportContent(ready, '   '))).toBe(false);
  });

  it('sanitizes catalog return targets and strips unknown/private URL state', () => {
    expect(safeEntityImportReturnTo('/entities?search=mysql&type=database&token=private')).toContain('search=mysql');
    expect(safeEntityImportReturnTo('/entities?search=mysql&type=database&token=private')).not.toContain('token');
    expect(safeEntityImportReturnTo('https://evil.example/entities?search=private')).toBe('/entities');
  });
});
