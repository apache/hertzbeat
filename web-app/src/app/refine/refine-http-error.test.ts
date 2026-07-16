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

import { createRefineHttpError, toRefineHttpError } from './refine-http-error';

describe('Refine HTTP error boundary', () => {
  it('preserves envelope evidence without reporting HTTP 200 as a successful status', () => {
    const error = toRefineHttpError(new ApiMessageError('Organization not found', { code: 15, status: 200 }));

    expect(error).toMatchObject({
      name: 'RefineHttpError',
      message: 'Server rejected the request',
      statusCode: 400,
      httpStatus: 200,
      code: 15,
      kind: 'envelope'
    });
    expect(Object.hasOwn(error, 'cause')).toBe(false);
  });

  it('distinguishes HTTP, network, and local contract failures', () => {
    expect(toRefineHttpError(new ApiMessageError('Bearer private-http-token', { status: 503 }))).toMatchObject({
      message: 'Request failed',
      statusCode: 503,
      httpStatus: 503,
      code: undefined,
      kind: 'http'
    });
    const network = toRefineHttpError(new ApiMessageError(
      'token=private-network-token',
      { cause: new TypeError('private-network-cause') }
    ));
    expect(network).toMatchObject({
      message: 'Network request failed',
      statusCode: 0,
      code: 'NETWORK_REQUEST_FAILED',
      kind: 'network'
    });
    expect(`${network.message} ${JSON.stringify(network)}`).not.toContain('private-network');
    expect(Object.hasOwn(network, 'cause')).toBe(false);
    expect(createRefineHttpError('Unsupported resource', 400, 'LABEL_RESOURCE_UNSUPPORTED'))
      .toMatchObject({ statusCode: 400, code: 'LABEL_RESOURCE_UNSUPPORTED', kind: 'contract' });
  });
});
