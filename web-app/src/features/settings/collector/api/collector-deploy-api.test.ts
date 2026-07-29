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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiMessagePost } from '@/core/http/api-message';

import { CollectorContractError } from '../model/collector-model';
import { CollectorDeployContractError, generateCollectorDeployInfo } from './collector-deploy-api';

vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessagePost: vi.fn()
}));

const post = vi.mocked(apiMessagePost);

describe('Collector deploy API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normalizes the identity and encodes it as one path segment', async () => {
    post.mockResolvedValue({ identity: 'edge/a', host: '10.0.0.7' });

    await expect(generateCollectorDeployInfo(' edge/a ')).resolves.toEqual({
      identity: 'edge/a',
      host: '10.0.0.7'
    });

    expect(post).toHaveBeenCalledWith('/api/collector/generate/edge%2Fa', null, undefined);
  });

  it.each(['', '   ', 'edge\nwest', 'x'.repeat(129)])(
    'rejects invalid identity %j before transport',
    async collector => {
      await expect(generateCollectorDeployInfo(collector)).rejects.toBeInstanceOf(CollectorContractError);
      expect(post).not.toHaveBeenCalled();
    }
  );

  it.each([
    { identity: 'edge', host: '' },
    { identity: 'edge', host: '   ' },
    { identity: 'edge', host: ' 10.0.0.7' },
    { identity: 'edge', host: '10.0.0.7\nsecond-line' },
    { identity: 'edge', host: '10.0.\t0.7' },
    { identity: 'edge', host: '10.0.0.7\u0000' },
    { identity: 'edge', host: '10.0.0.7\u0085' },
    { identity: 'other', host: '10.0.0.7' },
    { identity: 'edge', host: '10.0.0.7', token: 'must-not-enter-ui' }
  ])('rejects strict or mismatched response %#', async response => {
    post.mockResolvedValue(response);

    await expect(generateCollectorDeployInfo('edge')).rejects.toBeInstanceOf(CollectorDeployContractError);
  });
});
