/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { ApiMessageError, apiMessagePost } from '@/core/http/api-message';
import { EntityContractError } from '../model/entity-contract';
import type { EntityImportFailure, EntityImportRequest } from '../model/entity-import-model';
import { parseEditableEntityDtos } from './entity-editor-schema';

const parsePath = '/api/entities/definition/bundle/parse';
const importPath = '/api/entities/definition/bundle';
const createdIdsSchema = z.array(z.number().int().positive().safe()).min(1).max(100);

export async function previewEntityDefinitionBundle(request: EntityImportRequest, signal?: AbortSignal) {
  const value = await apiMessagePost(parsePath, request, signal ? { signal } : undefined);
  return parseEditableEntityDtos(value);
}

export async function commitEntityDefinitionBundle(
  request: EntityImportRequest,
  expectedCount: number,
  signal?: AbortSignal
) {
  const value = await apiMessagePost(importPath, request, signal ? { signal } : undefined);
  const result = createdIdsSchema.safeParse(value);
  if (!result.success || result.data.length !== expectedCount) {
    throw new EntityContractError('Created resource identifiers are invalid');
  }
  return result.data;
}

export function classifyEntityImportError(error: unknown, content: string): EntityImportFailure {
  if (error instanceof EntityContractError) return { kind: 'contract' };
  if (error instanceof ApiMessageError) {
    if (error.status === 401 || error.status === 403) return { kind: 'permission' };
    if (error.code === 1) return withSafeMessage('validation', error.message, content);
    if (error.code === 15) return withSafeMessage('unavailable', error.message, content);
    if (error.cause !== undefined || [0, 502, 503, 504].includes(error.status ?? 0)) return { kind: 'unavailable' };
  }
  return { kind: 'error' };
}

function withSafeMessage(kind: 'validation' | 'unavailable', message: string, content: string): EntityImportFailure {
  const normalized = message.trim();
  const hasControlCharacter = [...normalized].some(character => (character.codePointAt(0) ?? 32) < 32);
  if (!normalized || normalized.length > 240 || hasControlCharacter) return { kind };
  const messageFragments = normalized
    .toLowerCase()
    .split(/[^\p{L}\p{N}_.:@/-]+/u)
    .filter(fragment => fragment.length >= 4);
  const normalizedContent = content.toLowerCase();
  if (messageFragments.some(fragment => normalizedContent.includes(fragment))) return { kind };
  return { kind, message: normalized };
}
