/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('Alert integration locale contract', () => {
  const localizedCloudSources = ['tencent', 'alibabacloud-sls', 'huaweicloud-ces', 'volcengine'] as const;
  const invariantProductSources = [
    'webhook',
    'prometheus',
    'alertmanager',
    'skywalking',
    'uptime-kuma',
    'zabbix'
  ] as const;
  const allSources = [...invariantProductSources, ...localizedCloudSources] as const;

  it('keeps every source name available in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      for (const source of allSources) {
        expect(locale.alert.integration.source[source]).toEqual(expect.any(String));
        expect(locale.alert.integration.source[source].trim()).not.toBe('');
      }
    }
  });

  it('uses official localized cloud vendor names in both Chinese locales', () => {
    for (const source of localizedCloudSources) {
      expect(zhCn.alert.integration.source[source]).not.toBe(en.alert.integration.source[source]);
      expect(zhTw.alert.integration.source[source]).not.toBe(en.alert.integration.source[source]);
    }
  });

  it('keeps protocol and product source names invariant across locales', () => {
    for (const source of invariantProductSources) {
      for (const locale of [ja, pt, zhCn, zhTw]) {
        expect(locale.alert.integration.source[source]).toBe(en.alert.integration.source[source]);
      }
    }
  });
});
