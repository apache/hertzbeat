/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  ApiMessageError, apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut, type PageResult
} from '@/core/http/api-message';
import type {
  Bulletin, BulletinDraft, BulletinMetricField, BulletinMetrics, BulletinQuery
} from '../model/bulletin-model';
import { buildBulletinListPath, buildBulletinPayload } from '../model/bulletin-model';
import { sameBulletin } from '../model/bulletin-model';
import {
  BulletinContractError,
  parseBulletinPageWire,
  parseBulletinWire,
  parseMetricsWire,
  type BulletinMetricFieldWire
} from './bulletin-schema';

export { BulletinContractError } from './bulletin-schema';

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
  return validatePageIdentity(
    parseBulletinPageWire(await apiMessageGet(buildBulletinListPath(query))),
    query
  );
}

export async function loadBulletin(id: number) {
  const value = await apiMessageGet(`/api/bulletin/${id}`);
  if (value == null) throw new BulletinMissingError();
  const bulletin = parseBulletinWire(value);
  if (bulletin.id !== id) throw new BulletinContractError('Bulletin identity mismatch');
  return bulletin;
}

export async function loadBulletinMetrics(id: number) {
  return mapMetrics(parseMetricsWire(await apiMessageGet(`/api/bulletin/metrics?id=${id}`)));
}

export async function createBulletin(draft: BulletinDraft) {
  await apiMessagePost('/api/bulletin', buildBulletinPayload(draft));
}
export async function updateBulletin(draft: BulletinDraft) {
  await apiMessagePut('/api/bulletin', buildBulletinPayload(draft));
}
export async function deleteBulletin(id: number) {
  await apiMessageDelete(`/api/bulletin?ids=${id}`);
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

function validatePageIdentity(page: PageResult<Bulletin>, query: BulletinQuery) {
  if (page.number !== query.pageIndex
    || page.size !== query.pageSize
    || page.totalPages !== Math.ceil(page.totalElements / page.size)
    || page.content.length > page.size) {
    throw new BulletinContractError('Bulletin page identity did not match the request');
  }
  return page;
}

function mapMetrics(wire: ReturnType<typeof parseMetricsWire>): BulletinMetrics {
  return {
    name: wire.name,
    content: wire.content.map(row => ({
      monitorName: row.monitorName,
      monitorId: row.monitorId,
      host: row.host,
      metrics: row.metrics.map(metric => ({
        name: metric.name,
        fields: metric.fields.map(group => group.map(mapMetricField))
      }))
    }))
  };
}

function mapMetricField(field: BulletinMetricFieldWire): BulletinMetricField {
  if (field.value === 'No Data') {
    if (field.unit) throw new BulletinContractError('No-data field cannot expose a unit');
    return { key: field.key, unit: '', value: null, status: 'no-data' };
  }
  return { key: field.key, unit: field.unit, value: field.value, status: 'value' };
}
