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
  createSystemConfigDraft,
  createSystemConfigResourceRecord,
  createSystemTimezoneResourceRecord,
  isSystemConfigDirty,
  localeToRuntime,
  systemConfigResourceId,
  systemTimezonesResourceId,
  validateSystemConfigDraft
} from './system-config-model';

describe('system configuration model', () => {
  it('normalizes unsupported backend values to explicit runtime defaults', () => {
    expect(createSystemConfigDraft(null, { locale: 'zh-CN', timeZoneId: 'Asia/Shanghai', theme: 'dark' })).toEqual({
      locale: 'zh_CN',
      timeZoneId: 'Asia/Shanghai',
      theme: 'dark'
    });
    expect(
      createSystemConfigDraft(
        { locale: 'unknown', timeZoneId: '', theme: 'other' },
        { locale: 'en-US', timeZoneId: 'UTC', theme: 'dark' }
      )
    ).toEqual({ locale: 'en_US', timeZoneId: 'UTC', theme: 'dark' });
  });

  it('maps persisted locale identifiers to the runtime catalog', () => {
    expect(localeToRuntime('ja_JP')).toBe('ja-JP');
    expect(localeToRuntime('unsupported')).toBe('en-US');
  });

  it('requires every setting and compares normalized values', () => {
    expect(validateSystemConfigDraft({ locale: '', timeZoneId: '', theme: '' })).toEqual([
      'locale',
      'timeZoneId',
      'theme'
    ]);
    const baseline = { locale: 'en_US' as const, timeZoneId: 'UTC', theme: 'dark' as const };
    expect(isSystemConfigDirty({ ...baseline }, baseline)).toBe(false);
    expect(isSystemConfigDirty({ ...baseline, timeZoneId: 'Asia/Shanghai' }, baseline)).toBe(true);
  });

  it('owns strict singleton and timezone resource identities', () => {
    expect(systemConfigResourceId).toBe('current');
    expect(createSystemConfigResourceRecord({ locale: 'en_US', timeZoneId: 'UTC', theme: 'dark' })).toEqual({
      id: 'current',
      locale: 'en_US',
      timeZoneId: 'UTC',
      theme: 'dark'
    });
    expect(systemTimezonesResourceId).toBe('timezones');
    expect(createSystemTimezoneResourceRecord([{ zoneId: 'UTC', offset: 'UTC+00:00', displayName: 'UTC' }])).toEqual({
      id: 'timezones',
      items: [{ zoneId: 'UTC', offset: 'UTC+00:00', displayName: 'UTC' }]
    });
  });

  it('rejects null or malformed authoritative records instead of applying runtime defaults', () => {
    const malformed = [
      null,
      { locale: 'other', timeZoneId: 'UTC', theme: 'dark' },
      { locale: 'en_US', timeZoneId: '', theme: 'dark' },
      { locale: 'en_US', timeZoneId: 'UTC', theme: 'other' }
    ];
    for (const value of malformed) {
      expect(() => createSystemConfigResourceRecord(value as never)).toThrow();
    }
    expect(() =>
      createSystemTimezoneResourceRecord([{ zoneId: '', offset: 'private', displayName: 'private' }])
    ).toThrow();
  });
});
