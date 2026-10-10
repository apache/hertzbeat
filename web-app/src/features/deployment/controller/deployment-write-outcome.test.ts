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

import { describe, expect, it } from 'vitest';

import { DeploymentRequestError } from '../api/deployment-api';
import { deploymentWriteOutcome } from './deployment-write-outcome';

describe('deployment write outcome', () => {
  it.each([
    [new DeploymentRequestError('http', 409, 'operation_conflict'), 'definite_rejection'],
    [new DeploymentRequestError('http', 408), 'uncertain'],
    [new DeploymentRequestError('http', 500), 'uncertain'],
    [new DeploymentRequestError('unavailable'), 'uncertain'],
    [new DeploymentRequestError('contract'), 'uncertain']
  ] as const)('classifies receipt evidence without inspecting raw content', (failure, expected) => {
    expect(deploymentWriteOutcome(failure)).toBe(expected);
  });
});
