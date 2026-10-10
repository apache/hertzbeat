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

import { SetupRequestError } from '../api/setup-api';
import { SetupContractError } from '../api/setup-schema';
import type { SetupRequestFailure } from '../model/setup-configuration-state';

export function classifySetupRequestFailure(error: unknown): SetupRequestFailure {
  if (error instanceof SetupContractError) return { failure: 'contract', errorCode: null };
  if (error instanceof SetupRequestError) {
    const failure = error.kind === 'unavailable' || error.kind === 'contract' ? error.kind : 'error';
    return { failure, errorCode: error.errorCode ?? null };
  }
  return { failure: 'error', errorCode: null };
}
