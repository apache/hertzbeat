/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';

import type { CollectorMutationFailure } from '../model/collector-model';

export function classifyCollectorApiFailure(error: unknown): CollectorMutationFailure {
  if (!(error instanceof ApiMessageError)) return 'error';
  if (error.status === 401 || error.status === 403) return 'permission';
  if (error.status !== undefined && error.status >= 400 && error.status < 500) return 'validation';
  if (error.code !== undefined) return 'validation';
  return error.status === undefined || error.status === 0 || error.status >= 500 || error.cause !== undefined
    ? 'unavailable'
    : 'error';
}
