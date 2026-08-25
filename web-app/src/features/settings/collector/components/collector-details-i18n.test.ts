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

const detailsKeys = [
  'action',
  'actionNamed',
  'title',
  'updatedAt',
  'properties',
  'assignments',
  'operations',
  'position',
  'previous',
  'next',
  'close',
  'resize',
  'moreActions'
] as const;

describe('Collector details locale contract', () => {
  it('keeps every visible detail key in all runtime locales', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw] as LocaleRoot[]) {
      for (const key of detailsKeys) expect(locale.collectors.details[key]).toEqual(expect.any(String));
    }
  });
});

type LocaleRoot = {
  collectors: {
    details: Record<(typeof detailsKeys)[number], string>;
  };
};
