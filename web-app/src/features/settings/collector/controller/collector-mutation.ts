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

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import { classifyCollectorApiFailure } from '../api/collector-api-failure';
import type { CollectorMutationCommand, CollectorMutationFailure, CollectorRecord } from '../model/collector-model';

export function collectorMutationConverged(
  command: CollectorMutationCommand,
  projection: Pick<CollectorRecord, 'name' | 'online'>[]
) {
  const records = new Map(projection.map(record => [record.name, record]));
  return command.collectors.every(name => {
    const record = records.get(name);
    if (command.action === 'delete') return record === undefined;
    return record !== undefined && record.online === (command.action === 'online');
  });
}

export function classifyCollectorMutationFailure(error: unknown): CollectorMutationFailure {
  return classifyCollectorApiFailure(error);
}

type CollectorProjection = Pick<CollectorRecord, 'name' | 'online'>[];

export async function executeCollectorMutation(
  command: CollectorMutationCommand,
  write: (command: CollectorMutationCommand) => Promise<unknown>,
  reread: () => Promise<CollectorProjection>
) {
  try {
    await write(command);
  } catch (error) {
    const failure = classifyCollectorMutationFailure(error);
    if (!collectorMutationNeedsProof(error)) return { kind: 'failed' as const, failure };
    try {
      const projection = await reread();
      // An uncertain write leaves the outcome ambiguous. The projection is
      // evidence for the operator, not permission to report mutation success.
      return { kind: 'failed' as const, failure, projection };
    } catch {
      return { kind: 'failed' as const, failure };
    }
  }

  try {
    const projection = await reread();
    if (collectorMutationConverged(command, projection)) {
      return { kind: 'confirmed' as const, projection };
    }
    return { kind: 'failed' as const, failure: 'validation' as const, projection };
  } catch (error) {
    return {
      kind: 'failed' as const,
      failure: classifyCollectorMutationFailure(error) === 'error' ? ('error' as const) : ('unavailable' as const)
    };
  }
}

function collectorMutationNeedsProof(error: unknown) {
  return !(error instanceof ApiMessageError) || apiMessageWriteOutcome(error) === 'uncertain';
}
