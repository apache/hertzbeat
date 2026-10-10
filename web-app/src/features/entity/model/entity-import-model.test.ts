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

import {
  canConfirmEntityImport,
  changeEntityImportContent,
  changeEntityImportFormat,
  initialEntityImportDraft,
  buildEntityImportDetailPath,
  previewedEntityImport,
  safeEntityImportReturnTo
} from './entity-import-model';

const preview = [{ entity: { type: 'service', name: 'checkout' }, identities: [], monitorBinds: [], relations: [] }];

describe('entity import model', () => {
  it('enables confirmation only for the exact nonblank preview snapshot', () => {
    const drafted = changeEntityImportContent(initialEntityImportDraft, ' kind: service ');
    const ready = previewedEntityImport(drafted, preview);
    expect(canConfirmEntityImport(ready)).toBe(true);
    expect(changeEntityImportContent(ready, 'kind: database').preview).toBeUndefined();
    expect(changeEntityImportFormat(ready, 'json').preview).toBeUndefined();
    expect(canConfirmEntityImport(changeEntityImportContent(ready, '   '))).toBe(false);
  });

  it('sanitizes catalog return targets and strips unknown/private URL state', () => {
    expect(safeEntityImportReturnTo('/entities?search=mysql&type=database&token=private')).toContain('search=mysql');
    expect(safeEntityImportReturnTo('/entities?search=mysql&type=database&token=private')).not.toContain('token');
    expect(safeEntityImportReturnTo('https://evil.example/entities?search=private')).toBe('/entities');
    expect(buildEntityImportDetailPath(41, '/entities?search=mysql&token=private')).toBe(
      '/entities/41?returnTo=%2Fentities%3Fsort%3DgmtUpdate%26order%3Ddesc%26pageIndex%3D0%26pageSize%3D10%26search%3Dmysql'
    );
  });
});
