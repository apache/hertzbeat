/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';
import type { RuntimeStatusRequestFailure } from '../model/runtime-status-contract';
import { RuntimeStatusContractError } from './runtime-status-schema';

export function classifyRuntimeStatusRequestFailure(error: unknown): RuntimeStatusRequestFailure {
  if (error instanceof RuntimeStatusContractError) return 'contract';
  if (!(error instanceof ApiMessageError)) return 'error';
  if (error.status === 401 || error.status === 403) return 'permission';
  if (error.status === undefined || error.status >= 500) return 'unavailable';
  return 'error';
}
