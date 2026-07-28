/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';

import { classifyCollectorApiFailure } from '../api/collector-api-failure';
import type { CollectorListState, CollectorPage } from '../model/collector-model';

export function resolveCollectorListState(
  query: UseQueryResult<CollectorPage>,
  proofFailure: boolean,
  canRead: boolean
): CollectorListState {
  if (!canRead) return { kind: 'permission' };
  if (proofFailure) return { kind: 'unavailable' };
  if (query.isPending) return { kind: 'loading' };
  if (query.error) return { kind: readFailureKind(query.error) };
  if (!query.data) return { kind: 'error' };
  if (query.data.content.length === 0) return { kind: 'empty' };
  return { kind: 'ready', records: query.data.content, total: query.data.totalElements };
}

function readFailureKind(error: unknown): 'permission' | 'unavailable' | 'error' {
  const failure = classifyCollectorApiFailure(error);
  return failure === 'permission' || failure === 'unavailable' ? failure : 'error';
}
