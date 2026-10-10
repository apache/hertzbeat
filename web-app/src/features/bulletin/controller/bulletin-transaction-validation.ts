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

import type { BulletinDependencyProof } from '../model/bulletin-dependency-proof';
import { validateBulletinDraft, type BulletinDraft } from '../model/bulletin-model';

type BulletinValidationProof = Pick<
  BulletinDependencyProof,
  'fieldSelection' | 'kind' | 'metrics' | 'monitorSelection' | 'monitors'
>;

export function getValidBulletinDraft(
  draft: BulletinDraft | null,
  dependencies: BulletinValidationProof,
  onInvalid: () => void
) {
  if (!draft || dependencies.kind !== 'ready') return null;
  const invalid =
    dependencies.monitorSelection !== 'valid' ||
    dependencies.fieldSelection !== 'valid' ||
    validateBulletinDraft(draft, dependencies.monitors, dependencies.metrics).length > 0;
  if (!invalid) return draft;
  onInvalid();
  return null;
}
