/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
