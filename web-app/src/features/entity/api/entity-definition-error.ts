/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';
import { EntityContractError } from '../model/entity-contract';
import type { EntityDefinitionFailure } from '../model/entity-definition-model';

export function classifyEntityDefinitionError(error: unknown): EntityDefinitionFailure {
  if (error instanceof EntityContractError) return { kind: 'contract' };
  if (error instanceof ApiMessageError) {
    if (error.code === 3 || error.status === 404) return { kind: 'missing' };
    if (error.status === 401 || error.status === 403) return { kind: 'permission' };
    if (error.code === 1) return { kind: 'validation' };
    if (error.code === 15) return { kind: 'unavailable' };
    if (error.cause !== undefined || [0, 502, 503, 504].includes(error.status ?? 0)) return { kind: 'unavailable' };
  }
  return { kind: 'error' };
}
