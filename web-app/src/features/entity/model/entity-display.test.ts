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

import { localizeEntityCode } from './entity-display';

describe('entity display codes', () => {
  const translate = (key: string) => `translated:${key}`;

  it('centralizes known resource, status, source, direction, and recognition codes', () => {
    expect(localizeEntityCode(translate, 'type', 'service')).toBe('translated:entity.values.type.service');
    expect(localizeEntityCode(translate, 'status', 'healthy')).toBe('translated:entity.values.status.healthy');
    expect(localizeEntityCode(translate, 'source', 'manual')).toBe('translated:entity.values.source.manual');
    expect(localizeEntityCode(translate, 'source', 'derived')).toBe('translated:entity.values.source.derived');
    expect(localizeEntityCode(translate, 'direction', 'outgoing')).toBe('translated:entity.values.direction.outgoing');
    expect(localizeEntityCode(translate, 'direction', 'related')).toBe('translated:entity.values.direction.related');
    expect(localizeEntityCode(translate, 'identityType', 'derived')).toBe(
      'translated:entity.values.identityType.derived'
    );
  });

  it('safely falls back to trimmed unknown codes and a missing marker', () => {
    expect(localizeEntityCode(translate, 'source', ' vendor_source ')).toBe('vendor_source');
    expect(localizeEntityCode(translate, 'source', '')).toBe('—');
  });
});
