/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import english from '@/assets/i18n/en-us.json';
type PermissionCatalog = Pick<typeof english, 'exploreSaved' | 'exploreLog'>;
const catalogs = import.meta.glob<PermissionCatalog>('../../../assets/i18n/*.json', { eager: true, import: 'default' });
it.each(Object.entries(catalogs))(
  'defines action-specific permission feedback in the runtime catalog for %s',
  (path, catalog) => {
    for (const key of ['savePermission', 'deletePermission'] as const) {
      expect(catalog.exploreSaved[key]).toBeTruthy();
      expect(catalog.exploreSaved[key]).not.toBe(catalog.exploreSaved.writeFailed);
    }
    for (const key of ['overviewPermission', 'trendPermission'] as const) {
      expect(catalog.exploreLog[key]).toBeTruthy();
      expect(catalog.exploreLog[key]).not.toBe(catalog.exploreLog.statisticsUnavailable);
    }
  }
);
