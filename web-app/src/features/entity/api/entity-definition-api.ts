/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';
import { EntityContractError } from '../model/entity-contract';
import type { EntityDefinitionFormat, EntityDefinitionRequest } from '../model/entity-definition-model';
import { classifyEntityDefinitionError } from './entity-definition-error';
import { parseEditableEntityDto } from './entity-editor-schema';

const definitionTextSchema = z.string().refine(value => value.trim().length > 0);

export async function loadEntityDefinition(id: number, format: EntityDefinitionFormat, signal?: AbortSignal) {
  const value = await apiMessageGet(`${definitionBase(id)}?format=${format}`, signal ? { signal } : undefined);
  const result = definitionTextSchema.safeParse(value);
  if (!result.success) throw new EntityContractError('Resource definition response is invalid');
  return result.data;
}

export async function previewEntityDefinition(id: number, request: EntityDefinitionRequest, signal?: AbortSignal) {
  const value = await apiMessagePost(`${definitionBase(id)}/parse`, request, signal ? { signal } : undefined);
  return parseEditableEntityDto(value);
}

export async function saveEntityDefinition(id: number, request: EntityDefinitionRequest, signal?: AbortSignal) {
  const value = await apiMessagePut(definitionBase(id), request, signal ? { signal } : undefined);
  if (value !== null) throw new EntityContractError('Resource definition save response is invalid');
}

function definitionBase(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new EntityContractError('Resource definition request is invalid');
  return `/api/entities/${id}/definition`;
}

export { classifyEntityDefinitionError };
