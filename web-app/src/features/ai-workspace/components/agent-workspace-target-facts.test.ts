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
import type { TFunction } from 'i18next';
import { agentWorkspaceTargetFacts } from './agent-workspace-target-facts';

const t = ((key: string) => key) as TFunction;
describe('agent target scope', () => {
  it('shows a dated timezone-aware log range rather than raw epoch milliseconds', () => {
    const facts = agentWorkspaceTargetFacts(
      {
        log: {
          start: 1760000000000,
          end: 1760000060000,
          hideInternal: true,
          hideNoise: false,
          pageIndex: 0,
          pageSize: 20
        }
      },
      t
    );
    expect(facts.join(' ')).not.toContain('1760000000000');
    expect(facts.join(' ')).toContain('2025');
    expect(facts.join(' ')).toMatch(/UTC|GMT/);
  });
  it('includes the trace query window', () => {
    const facts = agentWorkspaceTargetFacts(
      { trace: { traceId: 'trace-1', start: 1760000000000, end: 1760000060000 } },
      t
    );
    expect(facts.join(' ')).toContain('2025');
  });
});
