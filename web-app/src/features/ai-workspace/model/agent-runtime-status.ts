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

/** Canonical UI names for runtime wire statuses; unknown values stay unknown. */
export function agentToolStatus(status: string, errorMessage?: string): string {
  const normalized = status.toUpperCase();
  if (
    (normalized === 'DENIED' || normalized === 'DECLINED') &&
    errorMessage === 'CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED'
  )
    return 'CANCELLED';
  if (normalized === 'IN_PROGRESS') return 'RUNNING';
  if (normalized === 'COMPLETED') return 'SUCCEEDED';
  if (normalized === 'DECLINED') return 'DENIED';
  return normalized;
}

export function agentRequestIsPending(status: string): boolean {
  const normalized = status.toUpperCase();
  return normalized === 'PENDING' || normalized === 'WAITING_INPUT' || normalized === 'WAITING_APPROVAL';
}

export function agentToolIsTerminal(status: string): boolean {
  return ['SUCCEEDED', 'FAILED', 'DENIED', 'CANCELLED'].includes(agentToolStatus(status));
}
