/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { parseSystemConfig, parseSystemConfigMutationResult, SystemConfigContractError } from './system-config-schema';

const locales = ['en_US', 'zh_CN', 'zh_TW', 'ja_JP', 'pt_BR'] as const;
const themes = ['light-ops', 'dark-ops', 'compact'] as const;

describe('System Config wire schema', () => {
  it.each(locales)('accepts exact backend locale %s', locale => {
    expect(parseSystemConfig({ locale, timeZoneId: 'UTC', theme: 'dark-ops' })).toMatchObject({ locale });
  });

  it.each(themes)('accepts exact backend theme %s', theme => {
    expect(parseSystemConfig({ locale: 'en_US', timeZoneId: 'UTC', theme })).toMatchObject({ theme });
  });

  it.each(['en-US', 'other'])('rejects non-wire locale %s', locale => {
    expect(() => parseSystemConfig({ locale, timeZoneId: 'UTC', theme: 'dark-ops' })).toThrow(
      SystemConfigContractError
    );
  });

  it.each(['default', 'dark', 'other'])('rejects browser-only or unknown theme %s', theme => {
    expect(() => parseSystemConfig({ locale: 'en_US', timeZoneId: 'UTC', theme })).toThrow(SystemConfigContractError);
  });

  it('parses the POST result with the same authoritative object contract', () => {
    const record = { locale: 'pt_BR', timeZoneId: 'America/Sao_Paulo', theme: 'light-ops' };
    expect(parseSystemConfigMutationResult(record)).toEqual(record);
    expect(() => parseSystemConfigMutationResult('Update config success')).toThrow(SystemConfigContractError);
  });
});
