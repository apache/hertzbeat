/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  ApiMessageError, apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut, type PageResult
} from '@/core/http/api-message';
import type {
  Bulletin, BulletinDraft, BulletinFields, BulletinMetric, BulletinMetricField, BulletinMetrics,
  BulletinMetricsRow, BulletinQuery
} from '../model/bulletin-model';
import { buildBulletinListPath, buildBulletinPayload } from '../model/bulletin-model';
import { sameBulletin } from '../model/bulletin-model';

export class BulletinContractError extends Error {
  readonly code = 'BULLETIN_RESPONSE_INVALID';
  constructor(message = 'Invalid bulletin response') { super(message); this.name = 'BulletinContractError'; }
}

export class BulletinMissingError extends Error {
  constructor() { super('Bulletin is missing'); this.name = 'BulletinMissingError'; }
}

export type BulletinFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';
type BulletinOperation = 'read-detail' | 'create' | 'update' | 'delete' | 'metrics' | 'list';
export function classifyBulletinError(error: unknown, operation: BulletinOperation = 'list'): BulletinFailureKind {
  if (error instanceof BulletinMissingError) return 'missing';
  if (error instanceof BulletinContractError) return 'invalid';
  if (!(error instanceof ApiMessageError)) return 'error';
  if (operation === 'read-detail' && error.status === 404) return 'missing';
  if (error.status == null || error.status >= 500 || operation === 'metrics' && error.status === 200 && error.code === 15) return 'unavailable';
  return 'error';
}

export async function loadBulletins(query: BulletinQuery) {
  return parsePage(await apiMessageGet<unknown>(buildBulletinListPath(query)), query);
}

export async function loadBulletin(id: number) {
  const value = await apiMessageGet<unknown>(`/api/bulletin/${id}`);
  if (value == null) throw new BulletinMissingError();
  const bulletin = parseBulletin(value);
  if (bulletin.id !== id) throw new BulletinContractError('Bulletin identity mismatch');
  return bulletin;
}

export async function loadBulletinMetrics(id: number) {
  return parseMetrics(await apiMessageGet<unknown>(`/api/bulletin/metrics?id=${id}`));
}

export async function createBulletin(draft: BulletinDraft) {
  await apiMessagePost<unknown>('/api/bulletin', buildBulletinPayload(draft));
}
export async function updateBulletin(draft: BulletinDraft) {
  await apiMessagePut<unknown>('/api/bulletin', buildBulletinPayload(draft));
}
export async function deleteBulletin(id: number) {
  await apiMessageDelete<unknown>(`/api/bulletin?ids=${id}`);
}

export async function createBulletinAndRead(draft: BulletinDraft) {
  const before = await loadExactNameBulletins(draft.name);
  await createBulletin(draft);
  const after = await loadExactNameBulletins(draft.name);
  const beforeIds = new Set(before.map(item => item.id));
  const created = after.filter(item => !beforeIds.has(item.id) && sameBulletin(item, draft));
  if (created.length !== 1) throw new BulletinContractError('Create evidence did not converge');
  return loadBulletin(created[0]!.id);
}

export async function updateBulletinAndRead(draft: BulletinDraft) {
  if (draft.id == null) throw new BulletinContractError('Update identity is missing');
  await updateBulletin(draft);
  const saved = await loadBulletin(draft.id);
  if (!sameBulletin(saved, draft)) throw new BulletinContractError('Update evidence did not converge');
  return saved;
}

export async function deleteBulletinAndConfirm(id: number) {
  await deleteBulletin(id);
  try {
    await loadBulletin(id);
  } catch (error) {
    if (classifyBulletinError(error, 'read-detail') === 'missing') return;
    throw error;
  }
  throw new BulletinContractError('Delete evidence did not converge');
}

async function loadExactNameBulletins(name: string) {
  const exact: Bulletin[] = [];
  let pageIndex = 0;
  let totalPages = 1;
  do {
    const page = await loadBulletins({ search: name.trim(), pageIndex, pageSize: 25 });
    if (page.totalPages > 20) throw new BulletinContractError('Create evidence exceeds safety bound');
    exact.push(...page.content.filter(item => item.name === name.trim()));
    totalPages = page.totalPages;
    pageIndex += 1;
  } while (pageIndex < totalPages);
  return exact;
}

function object(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BulletinContractError(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function integer(value: unknown, positive = false) {
  if (!Number.isSafeInteger(value) || positive && Number(value) <= 0 || !positive && Number(value) < 0) throw new BulletinContractError();
  return Number(value);
}
function text(value: unknown, nullable = false) {
  if (nullable && value == null) return null;
  if (typeof value !== 'string') throw new BulletinContractError();
  return value;
}
function stringArray(value: unknown) {
  if (!Array.isArray(value)) throw new BulletinContractError();
  return value.map(item => text(item)!);
}
function parseFields(value: unknown): BulletinFields {
  const source = object(value, 'fields');
  return Object.fromEntries(Object.entries(source).map(([key, fields]) => [key, stringArray(fields)]));
}
function parseBulletin(value: unknown): Bulletin {
  const item = object(value, 'bulletin');
  if (!Array.isArray(item.monitorIds)) throw new BulletinContractError();
  return {
    id: integer(item.id, true), name: text(item.name)!, app: text(item.app)!,
    monitorIds: item.monitorIds.map(id => integer(id, true)), fields: parseFields(item.fields),
    creator: text(item.creator, true), modifier: text(item.modifier, true),
    gmtCreate: text(item.gmtCreate, true), gmtUpdate: text(item.gmtUpdate, true)
  };
}
function parsePage(value: unknown, query: BulletinQuery): PageResult<Bulletin> {
  const page = object(value, 'page');
  if (!Array.isArray(page.content)) throw new BulletinContractError();
  const result = {
    content: page.content.map(parseBulletin), totalElements: integer(page.totalElements), totalPages: integer(page.totalPages),
    number: integer(page.number), size: integer(page.size, true)
  };
  if (result.number !== query.pageIndex || result.size !== query.pageSize
    || result.totalPages !== Math.ceil(result.totalElements / result.size) || result.content.length > result.size) throw new BulletinContractError();
  return result;
}
function parseMetricField(value: unknown): BulletinMetricField {
  const item = object(value, 'metric field');
  const rawValue = text(item.value)!;
  const unit = text(item.unit)!;
  if (rawValue === 'No Data') {
    if (unit) throw new BulletinContractError('No-data field cannot expose a unit');
    return { key: text(item.key)!, unit: '', value: null, status: 'no-data' };
  }
  return { key: text(item.key)!, unit, value: rawValue, status: 'value' };
}
function parseMetric(value: unknown): BulletinMetric {
  const item = object(value, 'metric');
  if (!Array.isArray(item.fields)) throw new BulletinContractError();
  return { name: text(item.name)!, fields: item.fields.map(group => Array.isArray(group) ? group.map(parseMetricField) : (() => { throw new BulletinContractError(); })()) };
}
function parseMetricsRow(value: unknown): BulletinMetricsRow {
  const item = object(value, 'metrics row');
  if (!Array.isArray(item.metrics)) throw new BulletinContractError();
  return { monitorName: text(item.monitorName)!, monitorId: integer(item.monitorId, true), host: text(item.host)!, metrics: item.metrics.map(parseMetric) };
}
function parseMetrics(value: unknown): BulletinMetrics {
  const item = object(value, 'metrics');
  if (!Array.isArray(item.content)) throw new BulletinContractError();
  return { name: text(item.name)!, content: item.content.map(parseMetricsRow) };
}
