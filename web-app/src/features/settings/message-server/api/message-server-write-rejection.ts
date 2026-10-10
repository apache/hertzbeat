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

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

/** Only an explicit HTTP 4xx proves that the Message Server POST did not commit. */
export function isDefiniteMessageServerWriteRejection(reason: unknown) {
  if (!(reason instanceof ApiMessageError)) return false;
  return apiMessageWriteOutcome(reason) === 'rejected';
}

export type MessageServerWriteFailure = 'revision-conflict' | 'revision-required' | 'rejected' | 'commit-uncertain';

export function classifyMessageServerWriteFailure(reason: unknown): MessageServerWriteFailure {
  if (reason instanceof ApiMessageError && reason.status === 409) return 'revision-conflict';
  if (reason instanceof ApiMessageError && reason.status === 428) return 'revision-required';
  return isDefiniteMessageServerWriteRejection(reason) ? 'rejected' : 'commit-uncertain';
}
