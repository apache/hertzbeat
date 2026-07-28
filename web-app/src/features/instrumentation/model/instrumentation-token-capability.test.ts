/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import { instrumentationTokenCapability } from './instrumentation-token-capability';

describe('Instrumentation token capability', () => {
  it.each([
    [['ADMIN'], true],
    [['USER'], false],
    [['GUEST'], false],
    [[], false]
  ] as const)('maps roles %j to generation capability %j', (roles, expected) => {
    expect(instrumentationTokenCapability(roles)).toEqual({ canGenerateToken: expected });
  });
});
