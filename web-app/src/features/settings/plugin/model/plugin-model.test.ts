/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  buildEmptyPluginUpload,
  pluginIdsByName,
  pluginPageIsComplete,
  pluginUploadConverged,
  pluginQueryAfterDelete,
  readPluginQuery,
  validatePluginUpload,
  writePluginQuery
} from './plugin-model';

describe('plugin model', () => {
  it('canonicalizes zero-based server search and pagination', () => {
    expect(readPluginQuery(new URLSearchParams('search=%20audit%20&pageIndex=2&pageSize=20&secret=drop'))).toEqual({
      search: 'audit',
      pageIndex: 2,
      pageSize: 20
    });
    expect(writePluginQuery({ search: ' audit ', pageIndex: 2, pageSize: 20 }).toString()).toBe(
      'pageIndex=2&pageSize=20&search=audit'
    );
    expect(readPluginQuery(new URLSearchParams('pageIndex=-1&pageSize=999'))).toEqual({
      search: '',
      pageIndex: 0,
      pageSize: 8
    });
  });

  it('keeps uploads in-memory and accepts only a non-empty jar File', () => {
    const jar = new File(['plugin'], 'audit.jar', { type: 'application/java-archive' });
    const wrong = new File(['plugin'], 'audit.zip', { type: 'application/zip' });
    const unsafe = new File(['plugin'], '../audit.jar', { type: 'application/java-archive' });

    expect(buildEmptyPluginUpload()).toEqual({ name: '', jarFile: null, enableStatus: true });
    expect(validatePluginUpload({ name: ' audit ', jarFile: jar, enableStatus: false })).toEqual({
      name: true,
      jarFile: true
    });
    expect(validatePluginUpload({ name: '   ', jarFile: wrong, enableStatus: true })).toEqual({
      name: false,
      jarFile: false
    });
    expect(validatePluginUpload({ name: 'audit', jarFile: unsafe, enableStatus: true }).jarFile).toBe(false);
  });

  it('moves to the previous page only when a confirmed delete empties the visible page', () => {
    const query = { search: '', pageIndex: 2, pageSize: 8 as const };

    expect(pluginQueryAfterDelete(query, { query, visibleRecords: 2, deleteCount: 2 })).toEqual({
      ...query,
      pageIndex: 1
    });
    expect(pluginQueryAfterDelete(query, { query, visibleRecords: 3, deleteCount: 2 })).toBeUndefined();
    expect(
      pluginQueryAfterDelete(query, { query: { ...query, search: 'new' }, visibleRecords: 2, deleteCount: 2 })
    ).toBeUndefined();
  });

  it('requires a new canonical identity before proving an uncertain upload', () => {
    const existing = { id: 11, name: 'audit', enableStatus: true };
    const uploaded = { id: 17, name: 'audit', enableStatus: true };
    const draft = { name: 'audit', jarFile: null, enableStatus: true };
    const baseline = { content: [existing], totalElements: 1, totalPages: 1, number: 0, size: 8 };

    expect(pluginPageIsComplete(baseline)).toBe(true);
    expect(pluginPageIsComplete({ ...baseline, totalElements: 2 })).toBe(false);
    expect(pluginUploadConverged({ ...baseline, content: [uploaded] }, draft, pluginIdsByName(baseline, 'audit'))).toBe(
      true
    );
    expect(pluginUploadConverged(baseline, draft, pluginIdsByName(baseline, 'audit'))).toBe(false);
  });
});
