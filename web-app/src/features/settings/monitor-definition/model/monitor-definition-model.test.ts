/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  buildCreateDraft,
  buildUpdateDraft,
  filterMonitorDefinitions,
  monitorDefinitionDraftRequiredFailure,
  monitorDefinitionFailureMessageKey,
  userCanWriteMonitorDefinitions
} from './monitor-definition-model';

const item = {
  app: 'mysql',
  label: 'MySQL Database',
  origin: 'override' as const,
  editable: true,
  deletable: true,
  revision: 'a'.repeat(64)
};

describe('monitor definition model', () => {
  it('filters by app or localized label without changing catalog order', () => {
    const catalog = [item, { ...item, app: 'jvm', label: 'JVM', origin: 'builtin' as const }];

    expect(filterMonitorDefinitions(catalog, 'database')).toEqual([item]);
    expect(filterMonitorDefinitions(catalog, 'JV')).toEqual([catalog[1]]);
    expect(filterMonitorDefinitions(catalog, '  ')).toEqual(catalog);
  });

  it('uses locale-independent matching', () => {
    const localizedLowerCase = vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(() => {
      throw new Error('browser locale must not affect catalog filtering');
    });

    expect(filterMonitorDefinitions([item], 'MYSQL')).toEqual([item]);
    expect(localizedLowerCase).not.toHaveBeenCalled();
    localizedLowerCase.mockRestore();
  });

  it('builds create and revision-owned update drafts without inventing YAML', () => {
    expect(buildCreateDraft()).toEqual({ mode: 'create', expectedApp: null, definition: '' });
    expect(buildUpdateDraft({ ...item, schemaVersion: 1, definition: 'app: mysql\ncategory: database' })).toEqual({
      mode: 'update',
      expectedApp: 'mysql',
      definition: 'app: mysql\ncategory: database',
      revision: 'a'.repeat(64)
    });
  });

  it('requires non-blank definition YAML before an editor command', () => {
    expect(monitorDefinitionDraftRequiredFailure(buildCreateDraft())).toBe('definition-required');
    expect(monitorDefinitionDraftRequiredFailure({ mode: 'create', expectedApp: null, definition: ' \n\t ' })).toBe(
      'definition-required'
    );
    expect(
      monitorDefinitionDraftRequiredFailure({ mode: 'create', expectedApp: null, definition: 'name:\n  en-US: Custom' })
    ).toBeNull();
  });

  it('keeps writes ADMIN-only and maps stable failures to i18n keys', () => {
    expect(userCanWriteMonitorDefinitions(['ADMIN'])).toBe(true);
    expect(userCanWriteMonitorDefinitions(['USER'])).toBe(false);
    expect(monitorDefinitionFailureMessageKey('revision-conflict')).toBe('monitorDefinitions.failure.revisionConflict');
    expect(monitorDefinitionFailureMessageKey('state-uncertain')).toBe('monitorDefinitions.failure.stateUncertain');
    expect(monitorDefinitionFailureMessageKey('forbidden')).toBe('monitorDefinitions.failure.forbidden');
    expect(monitorDefinitionFailureMessageKey('definition-required')).toBe(
      'monitorDefinitions.failure.definitionRequired'
    );
  });
});
