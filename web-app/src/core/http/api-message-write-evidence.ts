/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ApiMessageError } from './api-message';

export type ApiMessageWriteOutcome = 'rejected' | 'uncertain';

/**
 * Classifies only source transport evidence. Business envelope codes cannot
 * prove that a write was rejected before persistence.
 */
export function apiMessageWriteOutcome(error: ApiMessageError): ApiMessageWriteOutcome {
  if (error.cause !== undefined) return 'uncertain';
  const { status } = error;
  return status !== undefined && status >= 400 && status < 500 && status !== 408 ? 'rejected' : 'uncertain';
}
