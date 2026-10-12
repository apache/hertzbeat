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

export type LabelTransportFailureKind = 'rejected' | 'permission' | 'unavailable' | 'error';

type LabelTransportFailureOptions = {
  status?: number;
};

/** Redacted HTTP evidence owned by the Label API boundary. */
export class LabelTransportFailure extends Error {
  readonly kind: LabelTransportFailureKind;
  readonly status: number | undefined;

  constructor(kind: LabelTransportFailureKind, options: LabelTransportFailureOptions = {}) {
    super('Label request failed');
    this.name = 'LabelTransportFailure';
    this.kind = kind;
    this.status = options.status;
  }
}

export async function labelApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw normalizeLabelTransportFailure(reason);
  }
}

export function normalizeLabelTransportFailure(reason: unknown) {
  if (reason instanceof LabelTransportFailure) return reason;
  if (!(reason instanceof ApiMessageError)) return new LabelTransportFailure('error');
  if (reason.cause !== undefined || reason.status === undefined || reason.status === 0 || reason.status >= 500) {
    return new LabelTransportFailure('unavailable', reason.status === undefined ? {} : { status: reason.status });
  }
  if (reason.status === 401 || reason.status === 403) {
    return new LabelTransportFailure('permission', { status: reason.status });
  }
  if (isNonTimeoutClientStatus(reason.status)) {
    return new LabelTransportFailure('rejected', { status: reason.status });
  }
  return new LabelTransportFailure('error', { status: reason.status });
}

export function isExplicitLabelTransportRejection(reason: unknown) {
  return (
    reason instanceof LabelTransportFailure &&
    (reason.kind === 'rejected' || reason.kind === 'permission') &&
    reason.status !== undefined &&
    isNonTimeoutClientStatus(reason.status)
  );
}

function isNonTimeoutClientStatus(status: number) {
  return status >= 400 && status < 500 && status !== 408;
}
