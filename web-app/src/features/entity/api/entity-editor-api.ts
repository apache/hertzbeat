/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';
import type { EditableEntityDto } from '../model/entity-editor-contract';
import { parseCreatedEntityId, parseEditableEntityDto, parseEntityCatalogSuggestions } from './entity-editor-schema';

const entityEndpoint = '/api/entities';

export async function loadEditableEntity(id: number, signal?: AbortSignal) {
  const value = await apiMessageGet(`${entityEndpoint}/${id}`, signal ? { signal } : undefined);
  const dto = parseEditableEntityDto(value);
  if (dto.entity.id !== id) throw new Error('Editable entity does not match its request');
  return dto;
}

export async function loadEntityCatalogSuggestions(signal?: AbortSignal) {
  const value = await apiMessageGet(`${entityEndpoint}/catalog-suggestions?limit=120`, signal ? { signal } : undefined);
  return parseEntityCatalogSuggestions(value);
}

export async function saveEditableEntity(mode: 'new' | 'edit', payload: EditableEntityDto, signal?: AbortSignal) {
  const options = signal ? { signal } : undefined;
  if (mode === 'new') return parseCreatedEntityId(await apiMessagePost(entityEndpoint, payload, options));
  if (!payload.entity.id) throw new Error('Edited entity id is missing');
  await apiMessagePut(entityEndpoint, payload, options);
  return payload.entity.id;
}

export function classifyEntityWriteError(error: unknown): 'permission' | 'validation' | 'unavailable' | 'error' {
  if (error instanceof ApiMessageError) {
    if (error.status === 403) return 'permission';
    if (error.code === 1 || [400, 409, 422].includes(error.status ?? 0)) return 'validation';
    if (error.cause !== undefined || [0, 502, 503, 504].includes(error.status ?? 0)) return 'unavailable';
  }
  return 'error';
}
