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

import { loadCollectorRuntimeReport } from '../api/collector-management-api';
import {
  classifyCollectorRuntimeApplication,
  collectorRuntimeApplicationSettled,
  type CollectorRuntimeApplication,
  type CollectorRuntimeReport
} from '../model/collector-runtime-report-model';
import { classifyCollectorMutationFailure } from './collector-mutation';

// This is a short post-save convergence observation, not a runtime-health SLA.
// Exhaustion preserves waiting/unknown evidence and never upgrades it to applied.
const runtimeReportAttempts = 6;
const runtimeReportIntervalMilliseconds = 1_000;

type Options = {
  signal?: AbortSignal;
  read?: (collector: string, signal?: AbortSignal) => Promise<CollectorRuntimeReport | null>;
  wait?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  attempts?: number;
};

export async function waitForCollectorRuntimeApplication(
  collector: string,
  expectedRevision: number,
  options: Options = {}
): Promise<CollectorRuntimeApplication> {
  const read = options.read ?? loadCollectorRuntimeReport;
  const wait = options.wait ?? waitForInterval;
  const attempts = options.attempts ?? runtimeReportAttempts;
  let application = classifyCollectorRuntimeApplication(expectedRevision, null);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    options.signal?.throwIfAborted();
    try {
      application = classifyCollectorRuntimeApplication(expectedRevision, await read(collector, options.signal));
    } catch (error) {
      if (options.signal?.aborted) throw error;
      return {
        kind: 'unknown',
        expectedRevision,
        reason: runtimeReportFailureReason(error)
      };
    }
    if (collectorRuntimeApplicationSettled(application) || attempt === attempts - 1) return application;
    await wait(runtimeReportIntervalMilliseconds, options.signal);
  }
  return application;
}

function runtimeReportFailureReason(error: unknown) {
  const failure = classifyCollectorMutationFailure(error);
  if (failure === 'permission' || failure === 'unavailable') return failure;
  return 'error' as const;
}

function waitForInterval(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      globalThis.clearTimeout(timeout);
      reject(new DOMException('Collector runtime report wait aborted', 'AbortError'));
    };
    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
