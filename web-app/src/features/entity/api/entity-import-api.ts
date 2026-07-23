/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { apiMessagePost } from '@/core/http/api-message';
import { EntityContractError } from '../model/entity-contract';
import type { EntityImportFailure, EntityImportRequest } from '../model/entity-import-model';
import { classifyEntityDefinitionError } from './entity-definition-error';
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

export function classifyEntityImportError(error: unknown): EntityImportFailure {
  const failure = classifyEntityDefinitionError(error);
  if (failure.kind === 'missing') return { kind: 'error' };
  return { kind: failure.kind };
}
