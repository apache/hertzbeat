/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  buildEntityDefinitionRoute,
  canSaveEntityDefinition,
  changeEntityDefinitionContent,
  parseEntityDefinitionId,
  previewedEntityDefinition,
  resetEntityDefinitionDraft,
  safeEntityDefinitionReturnTo
} from './entity-definition-model';

const preview = {
  entity: { type: 'service', name: 'checkout' },
  identities: null,
  monitorBinds: null,
  relations: null
};

describe('entity definition model', () => {
  it('requires the exact route/content/format preview snapshot before save', () => {
    const initial = resetEntityDefinitionDraft(7, 'yaml', 'kind: service');
    const ready = previewedEntityDefinition(initial, preview);
    expect(canSaveEntityDefinition(ready, 7)).toBe(true);
    expect(changeEntityDefinitionContent(ready, 'kind: database').preview).toBeUndefined();
    expect(canSaveEntityDefinition(ready, 8)).toBe(false);
  });

  it('accepts only positive safe route IDs and preserves a sanitized detail return context', () => {
    expect(parseEntityDefinitionId('7')).toBe(7);
    expect(parseEntityDefinitionId('0')).toBeUndefined();
    const route = buildEntityDefinitionRoute(7, '/entities?search=mysql&token=private');
    expect(route).toContain('/entities/7/definition?returnTo=');
    expect(decodeURIComponent(route)).toContain('/entities/7?returnTo=');
    expect(decodeURIComponent(route)).not.toContain('token');
    expect(safeEntityDefinitionReturnTo(7, 'https://evil.example')).toBe('/entities/7');
  });
});
