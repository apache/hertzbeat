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
export type PluginFailureKind = 'missing' | 'invalid' | 'permission' | 'conflict' | 'unavailable' | 'error';
export type PluginWriteOutcome = 'rejected' | 'uncertain';
export type PluginDeleteTarget = { ids: number[]; label: string; mode: 'single' | 'batch' };
export type PluginDeleteReceipt = {
  query: PluginQuery;
  visibleRecords: number;
  deleteCount: number;
};

export const pluginPageSizes = [8, 20, 50] as const;
const pluginJarMaxBytes = 100 * 1024 * 1024;
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
    jarFile: Boolean(draft.jarFile && validJarFile(draft.jarFile))
  };
}

function validJarFile(file: File) {
  const name = file.name;
  return (
    file.size > 0 &&
    file.size <= pluginJarMaxBytes &&
    name.endsWith('.jar') &&
    !name.includes('..') &&
    !/[\n\r\t/\\]/u.test(name)
  );
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

export function pluginStatusConverged(page: PluginPage, id: number, enableStatus: boolean) {
  return page.content.some(plugin => plugin.id === id && plugin.enableStatus === enableStatus);
}

export function pluginDeleteConverged(page: PluginPage, ids: readonly number[]) {
  const remaining = new Set(page.content.map(plugin => plugin.id));
  return ids.every(id => !remaining.has(id));
}

export function pluginUploadConverged(page: PluginPage, draft: PluginUploadDraft, previousIds: ReadonlySet<number>) {
  const name = draft.name.trim();
  return page.content.some(
    plugin => plugin.name === name && plugin.enableStatus === draft.enableStatus && !previousIds.has(plugin.id)
  );
}

export function pluginIdsByName(page: PluginPage, name: string) {
  const exactName = name.trim();
  return new Set(page.content.filter(plugin => plugin.name === exactName).map(plugin => plugin.id));
}

export function pluginPageIsComplete(page: PluginPage) {
  return page.number === 0 && page.content.length === page.totalElements;
}

function sameQuery(left: PluginQuery, right: PluginQuery) {
  return left.search === right.search && left.pageIndex === right.pageIndex && left.pageSize === right.pageSize;
}
