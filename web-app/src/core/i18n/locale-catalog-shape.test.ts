/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import enRoot from '@/assets/i18n/en-us.json';
import enExplore from '@/assets/i18n/explore/en-us.json';
import jaExplore from '@/assets/i18n/explore/ja-jp.json';
import ptExplore from '@/assets/i18n/explore/pt-br.json';
import zhCnExplore from '@/assets/i18n/explore/zh-cn.json';
import zhTwExplore from '@/assets/i18n/explore/zh-tw.json';
import jaRoot from '@/assets/i18n/ja-jp.json';
import ptRoot from '@/assets/i18n/pt-br.json';
import enShell from '@/assets/i18n/shell/en-us.json';
import jaShell from '@/assets/i18n/shell/ja-jp.json';
import ptShell from '@/assets/i18n/shell/pt-br.json';
import zhCnShell from '@/assets/i18n/shell/zh-cn.json';
import zhTwShell from '@/assets/i18n/shell/zh-tw.json';
import zhCnRoot from '@/assets/i18n/zh-cn.json';
import zhTwRoot from '@/assets/i18n/zh-tw.json';
import { compareLocaleCatalogShape } from '@/test/locale-catalog-shape';

const catalogFamilies = {
  root: { en: enRoot, ja: jaRoot, pt: ptRoot, zhCn: zhCnRoot, zhTw: zhTwRoot },
  shell: { en: enShell, ja: jaShell, pt: ptShell, zhCn: zhCnShell, zhTw: zhTwShell },
  explore: { en: enExplore, ja: jaExplore, pt: ptExplore, zhCn: zhCnExplore, zhTw: zhTwExplore }
};

describe('locale catalog shape', () => {
  it.each(Object.entries(catalogFamilies))(
    '%s keeps every locale structurally identical to English',
    (_name, family) => {
      for (const [locale, catalog] of Object.entries(family)) {
        if (locale === 'en') continue;
        expect(compareLocaleCatalogShape(family.en, catalog), locale).toEqual([]);
      }
    }
  );

  it('reports missing, extra, and wrong-typed leaves with stable paths', () => {
    expect(
      compareLocaleCatalogShape(
        { common: { save: 'Save', nested: { title: 'Title' } } },
        { common: { save: { label: 'Save' }, extra: 'Extra' } }
      )
    ).toEqual(['extra:common.extra', 'missing:common.nested.title', 'type:common.save:string/object']);
  });
});
