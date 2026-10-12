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

import { loadExactAlertInhibit, snapshotAlertInhibitIds } from '../api/alert-inhibit-write-proof';
import type { AlertInhibitReceipt } from '../model/alert-inhibit-state';
import type {
  AlertInhibitOperationController,
  AlertInhibitOperationOwner
} from './use-alert-inhibit-operation-controller';

export async function prepareAlertInhibitReceipt(
  operation: AlertInhibitOperationController,
  owner: AlertInhibitOperationOwner,
  receipt: AlertInhibitReceipt
) {
  if (receipt.phase !== 'prepare') return true;
  if (receipt.kind === 'save') {
    const previousIds = await snapshotAlertInhibitIds();
    if (!operation.isCurrent(owner)) return false;
    receipt.previousIds = previousIds;
  } else {
    const record = await loadExactAlertInhibit(receipt.record.id);
    if (!operation.isCurrent(owner)) return false;
    receipt.record = record;
    receipt.expected = { ...record, enable: receipt.enable };
  }
  receipt.phase = 'write';
  return true;
}
