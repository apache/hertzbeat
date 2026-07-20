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
import { describe, expect, it } from 'vitest';
import {
  buildLabelDisplayName,
  buildLabelExpectedWrite,
  buildLabelMonitorPath,
  labelSaveConverged
} from './label-model';

describe('label model', () => {
  it('formats labels and builds Monitor query context', () => {
    expect(buildLabelDisplayName({ name: 'env', tagValue: 'prod' })).toBe('env:prod');
    expect(buildLabelDisplayName({ name: 'team', tagValue: ' ' })).toBe('team');
    expect(buildLabelMonitorPath({ name: 'env', tagValue: 'prod' })).toBe('/monitors?labels=env%3Aprod');
  });

  it('proves all writable fields rather than accepting identity alone', () => {
    const canonical = { id: 7, name: 'env', tagValue: 'prod', description: 'updated', type: 1 };

    expect(
      labelSaveConverged(
        buildLabelExpectedWrite({ name: ' env ', tagValue: ' prod ', description: ' updated ' }, 'create'),
        canonical
      )
    ).toBe(true);
    expect(
      labelSaveConverged(buildLabelExpectedWrite({ ...canonical, description: 'stale' }, 'update'), canonical)
    ).toBe(false);
    expect(labelSaveConverged(buildLabelExpectedWrite({ ...canonical, type: 2 }, 'update'), canonical)).toBe(false);
  });
});
