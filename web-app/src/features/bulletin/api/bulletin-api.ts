/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut,
  type PageResult
} from '@/core/http/api-message';

import { BulletinRequestFailure, classifyBulletinFailure } from '../model/bulletin-failure';
import type {
  Bulletin,
  BulletinDraft,
  BulletinMetricField,
  BulletinMetrics,
  BulletinQuery
} from '../model/bulletin-model';
import {
  buildBulletinListPath,
  buildBulletinPayload,
  isBulletinPageComplete,
  sameBulletin
} from '../model/bulletin-model';
import { bulletinApiRequest } from './bulletin-api-failure';
import {
  BulletinContractError,
  parseBulletinPageWire,
  parseBulletinWire,
  parseMetricsWire,
  type BulletinMetricFieldWire
} from './bulletin-schema';

export type { BulletinFailureKind } from '../model/bulletin-failure';

const createProofPageSize = 25;
const createProofMaxPages = 20;

export async function loadBulletins(query: BulletinQuery) {
  return bulletinApiRequest('list', async () => {
    const page = parseBulletinPageWire(await apiMessageGet(buildBulletinListPath(query)));
    return validatePageIdentity(page, query);
  });
}

export async function loadBulletin(id: number) {
  return bulletinApiRequest('read-detail', async () => {
    const value = await apiMessageGet(`/api/bulletin/${id}`);
    if (value == null) throw new BulletinRequestFailure('missing', 'uncertain');
    const bulletin = parseBulletinWire(value);
    if (bulletin.id !== id) throw new BulletinContractError('Bulletin identity mismatch');
    return bulletin;
  });
}

export async function loadBulletinMetrics(id: number) {
  return bulletinApiRequest('metrics', async () =>
    mapMetrics(parseMetricsWire(await apiMessageGet(`/api/bulletin/metrics?id=${id}`)))
  );
}

export async function createBulletin(draft: BulletinDraft) {
  await bulletinApiRequest('create', () => apiMessagePost('/api/bulletin', buildBulletinPayload(draft)));
}

export async function updateBulletin(draft: BulletinDraft) {
  await bulletinApiRequest('update', () => apiMessagePut('/api/bulletin', buildBulletinPayload(draft)));
}

export async function deleteBulletin(id: number) {
  await bulletinApiRequest('delete', () => apiMessageDelete(`/api/bulletin?ids=${id}`));
}

export async function captureBulletinCreateBaseline(name: string) {
  return bulletinApiRequest('list', async () => (await loadExactNameBulletins(name)).map(item => item.id));
}

export async function proveBulletinCreated(draft: BulletinDraft, beforeIds: readonly number[]) {
  return bulletinApiRequest('read-detail', async () => {
    const before = new Set(beforeIds);
    const candidates = (await loadExactNameBulletins(draft.name)).filter(
      item => !before.has(item.id) && sameBulletin(item, draft)
    );
    if (candidates.length !== 1) throw new BulletinContractError('Create evidence did not converge');
    const saved = await loadBulletin(candidates[0]!.id);
    if (!sameBulletin(saved, draft)) throw new BulletinContractError('Create detail evidence did not converge');
    return saved;
  });
}

export async function proveBulletinUpdated(draft: BulletinDraft & { id: number }) {
  return bulletinApiRequest('read-detail', async () => {
    const saved = await loadBulletin(draft.id);
    if (!sameBulletin(saved, draft)) throw new BulletinContractError('Update evidence did not converge');
    return saved;
  });
}

export async function proveBulletinDeleted(id: number) {
  return bulletinApiRequest('read-detail', async () => {
    try {
      await loadBulletin(id);
    } catch (error) {
      if (classifyBulletinFailure(error) === 'missing') return;
      throw error;
    }
    throw new BulletinContractError('Delete evidence did not converge');
  });
}

async function loadExactNameBulletins(name: string) {
  const exactName = name.trim();
  const exact: Bulletin[] = [];
  const seenIds = new Set<number>();
  let pageIndex = 0;
  let totalPages = 1;
  let scanIdentity: { totalElements: number; totalPages: number; size: number } | undefined;
  do {
    const page = await loadBulletins({ search: exactName, pageIndex, pageSize: createProofPageSize });
    if (page.totalPages > createProofMaxPages) {
      throw new BulletinContractError('Create evidence exceeds safety bound');
    }
    const currentIdentity = {
      totalElements: page.totalElements,
      totalPages: page.totalPages,
      size: page.size
    };
    if (scanIdentity && !sameScanIdentity(scanIdentity, currentIdentity)) {
      throw new BulletinContractError('Create evidence changed during pagination');
    }
    scanIdentity ??= currentIdentity;
    for (const item of page.content) {
      if (seenIds.has(item.id)) throw new BulletinContractError('Create evidence repeated an identity');
      seenIds.add(item.id);
      if (item.name === exactName) exact.push(item);
    }
    totalPages = page.totalPages;
    pageIndex += 1;
  } while (pageIndex < totalPages);
  return exact;
}

function sameScanIdentity(
  left: { totalElements: number; totalPages: number; size: number },
  right: { totalElements: number; totalPages: number; size: number }
) {
  return left.totalElements === right.totalElements && left.totalPages === right.totalPages && left.size === right.size;
}

function validatePageIdentity(page: PageResult<Bulletin>, query: BulletinQuery) {
  const ids = new Set(page.content.map(item => item.id));
  if (
    page.number !== query.pageIndex ||
    page.size !== query.pageSize ||
    !isBulletinPageComplete(page) ||
    ids.size !== page.content.length
  ) {
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
