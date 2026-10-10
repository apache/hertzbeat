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

import type { Monitor } from '@/features/monitor';

export const bulletinMonitorProofPolicy = {
  maximumPages: 20,
  pageSize: 50,
  // Backend compatibility value `9` requests all statuses so dependency proof cannot omit paused or unavailable monitors.
  status: '9'
} as const;

// These reserved definition namespaces cannot own a Bulletin monitor selection.
const excludedBulletinDependencyApplications = new Set(['prometheus', '__system__']);

export function isBulletinDependencyApplication(value: string) {
  return Boolean(value) && !excludedBulletinDependencyApplications.has(value);
}

type BulletinMonitorPageEvidence = {
  content: readonly Monitor[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type BulletinMonitorPageIdentity = Pick<BulletinMonitorPageEvidence, 'totalElements' | 'totalPages' | 'size'>;

/** Marks contradictory monitor pagination as invalid dependency evidence. */
export class BulletinMonitorPaginationEvidenceError extends Error {
  constructor() {
    super('Bulletin monitor pagination evidence is inconsistent');
    this.name = 'BulletinMonitorPaginationEvidenceError';
  }
}

/** Owns one bounded scan and freezes its identity from the first authoritative page. */
export class BulletinMonitorPaginationProof {
  readonly #ids = new Set<number>();
  readonly #records: Monitor[] = [];
  #identity: BulletinMonitorPageIdentity | undefined;

  get totalPages() {
    return this.#identity?.totalPages ?? 1;
  }

  accept(page: BulletinMonitorPageEvidence, requestedPage: number) {
    assertPageEvidence(page, requestedPage);
    const identity = pageIdentity(page);
    if (!this.#identity) this.#identity = identity;
    else if (!samePageIdentity(this.#identity, identity)) throw new BulletinMonitorPaginationEvidenceError();
    for (const monitor of page.content) {
      if (this.#ids.has(monitor.id)) throw new BulletinMonitorPaginationEvidenceError();
      this.#ids.add(monitor.id);
      this.#records.push(monitor);
    }
  }

  finish() {
    if (!this.#identity || this.#records.length !== this.#identity.totalElements) {
      throw new BulletinMonitorPaginationEvidenceError();
    }
    return [...this.#records];
  }
}

function assertPageEvidence(page: BulletinMonitorPageEvidence, requestedPage: number) {
  if (
    page.totalPages > bulletinMonitorProofPolicy.maximumPages ||
    page.number !== requestedPage ||
    page.size !== bulletinMonitorProofPolicy.pageSize ||
    page.totalPages !== Math.ceil(page.totalElements / page.size)
  ) {
    throw new BulletinMonitorPaginationEvidenceError();
  }
  const expectedCount = expectedPageRecordCount(page, requestedPage);
  if (expectedCount === undefined || page.content.length !== expectedCount) {
    throw new BulletinMonitorPaginationEvidenceError();
  }
}

function expectedPageRecordCount(page: BulletinMonitorPageEvidence, requestedPage: number) {
  if (page.totalElements === 0) return requestedPage === 0 && page.totalPages === 0 ? 0 : undefined;
  if (requestedPage >= page.totalPages) return undefined;
  return Math.min(page.size, page.totalElements - requestedPage * page.size);
}

function pageIdentity(page: BulletinMonitorPageEvidence): BulletinMonitorPageIdentity {
  return { totalElements: page.totalElements, totalPages: page.totalPages, size: page.size };
}

function samePageIdentity(left: BulletinMonitorPageIdentity, right: BulletinMonitorPageIdentity) {
  return left.totalElements === right.totalElements && left.totalPages === right.totalPages && left.size === right.size;
}
