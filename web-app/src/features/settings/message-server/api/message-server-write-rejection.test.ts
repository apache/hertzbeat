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

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { MessageServerContractError } from './message-server-schema';
import { isDefiniteMessageServerWriteRejection } from './message-server-write-rejection';

describe('message server write rejection', () => {
  it('permits a new write only after explicit business or HTTP client rejection', () => {
    expect(isDefiniteMessageServerWriteRejection(new ApiMessageError('business rejection', { code: 42 }))).toBe(true);
    expect(isDefiniteMessageServerWriteRejection(new ApiMessageError('client rejection', { status: 400 }))).toBe(true);
    expect(isDefiniteMessageServerWriteRejection(new ApiMessageError('server failure', { status: 503 }))).toBe(false);
    expect(isDefiniteMessageServerWriteRejection(new ApiMessageError('malformed response', { status: 200 }))).toBe(
      false
    );
    expect(isDefiniteMessageServerWriteRejection({ code: 20, status: 400 })).toBe(false);
    expect(isDefiniteMessageServerWriteRejection(new MessageServerContractError())).toBe(false);
    expect(isDefiniteMessageServerWriteRejection(new Error('network failure'))).toBe(false);
  });
});
