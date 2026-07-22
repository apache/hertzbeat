/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { readZeroBasedPage, writeZeroBasedPage } from '@/shared/query-context';

export type PluginRecord = {
  id: number;
  name: string;
  enableStatus: boolean;
  creator?: string;
  gmtCreate?: string;
  paramCount?: number;
};
export type PluginPage = {
  content: PluginRecord[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};
export type PluginPageSize = (typeof pluginPageSizes)[number];
export type PluginQuery = { search: string; pageIndex: number; pageSize: PluginPageSize };
export type PluginUploadDraft = { name: string; jarFile: File | null; enableStatus: boolean };
export type PluginFailureKind = 'operation-failed' | 'forbidden' | 'unavailable' | 'contract' | 'error';
export type PluginDeleteTarget = { ids: number[]; label: string; mode: 'single' | 'batch' };
export type PluginDeleteReceipt = {
  query: PluginQuery;
  visibleRecords: number;
  deleteCount: number;
};

export const pluginPageSizes = [8, 20, 50] as const;
const defaultPluginQuery: PluginQuery = { search: '', pageIndex: 0, pageSize: 8 };

export function readPluginQuery(params: URLSearchParams): PluginQuery {
  return {
    search: params.get('search')?.trim() ?? '',
    ...readZeroBasedPage(params, pluginPageSizes, defaultPluginQuery.pageSize)
  };
}

export function writePluginQuery(query: PluginQuery) {
  const normalized = readPluginQuery(
    new URLSearchParams({ search: query.search, pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) })
  );
  const params = writeZeroBasedPage(normalized.pageIndex, normalized.pageSize);
  if (normalized.search) params.set('search', normalized.search);
  return params;
}

export function buildEmptyPluginUpload(): PluginUploadDraft {
  return { name: '', jarFile: null, enableStatus: true };
}

export function validatePluginUpload(draft: PluginUploadDraft) {
  return {
    name: draft.name.trim().length > 0,
    jarFile: Boolean(draft.jarFile && draft.jarFile.size > 0 && draft.jarFile.name.toLowerCase().endsWith('.jar'))
  };
}

export function pluginQueryAfterDelete(current: PluginQuery, receipt: PluginDeleteReceipt) {
  if (!sameQuery(current, receipt.query) || current.pageIndex === 0 || receipt.visibleRecords > receipt.deleteCount) {
    return undefined;
  }
  return { ...current, pageIndex: current.pageIndex - 1 };
}

export function userCanWritePlugins(roles: readonly string[]) {
  return roles.includes('ADMIN');
}

function sameQuery(left: PluginQuery, right: PluginQuery) {
  return left.search === right.search && left.pageIndex === right.pageIndex && left.pageSize === right.pageSize;
}
