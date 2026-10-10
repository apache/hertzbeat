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

  it('describes full-text search scope in every Explore locale', () => {
    for (const catalog of Object.values(catalogFamilies.explore)) {
      expect(catalog.explore.logAuthoring.fullTextHelp).toContain('*:');
      expect(catalog.explore.logAuthoring.full_text_unsupported).toContain('*:');
    }
    expect(enExplore.explore.logAuthoring.fullTextHelp).toContain('History');
    expect(enExplore.explore.logAuthoring.fullTextHelp).toContain('Unlike bare terms');
    expect(enExplore.explore.logAuthoring.fullTextHelp).toContain('Live search does not support');
    expect(enExplore.explore.logAuthoring.full_text_unsupported).toContain('Live search');
  });

  it('localizes data-backed subquery rank metrics in every Explore locale', () => {
    for (const catalog of Object.values(catalogFamilies.explore)) {
      expect(catalog.explore.logSubquery.countUniqueOf).toBeTruthy();
      expect(catalog.explore.logSubquery.countUniqueOf).not.toContain('{{field}}');
      expect(catalog.explore.logSubquery.allLogs).toBeTruthy();
    }
  });

  it('localizes the facet query target selector in every Explore locale', () => {
    for (const catalog of Object.values(catalogFamilies.explore)) {
      expect(catalog.explore.logComparison.queryTarget).toContain('{{ref}}');
      expect(catalog.explore.logComparison.timelineTarget).toBeTruthy();
      expect(catalog.explore.logComparison.sourceNotExecuted).toBeTruthy();
    }
  });

  it('explains that extraction captures become calculated fields automatically', () => {
    for (const catalog of Object.values(catalogFamilies.explore)) {
      expect(catalog.explore.logCalculatedV2.regexHint).toContain('(?<token>...)');
      expect(catalog.explore.logCalculatedV2.grokMacros).toContain('%{notSpace:token}');
    }
    expect(enExplore.explore.logCalculatedV2.regexHint).toContain('automatically');
    expect(enExplore.explore.logCalculatedV2.grokMacros).toContain('automatically');
    expect(enExplore.explore.logCalculatedV2.regexHint).not.toContain('Output names');
    expect(enExplore.explore.logCalculatedV2.grokMacros).not.toContain('Output names');
  });

  it('localizes log result options and copy actions in every Explore locale', () => {
    for (const catalog of Object.values(catalogFamilies.explore)) {
      expect(catalog.explore.perses.rowHeight).toBeTruthy();
      expect(catalog.explore.perses.timelineGraph).toBeTruthy();
      expect(catalog.explore.perses.standardizeHeaders).toBeTruthy();
      expect(catalog.explore.logColumns.moveLeft).toContain('{{field}}');
      expect(catalog.explore.logColumns.moveRight).toContain('{{field}}');
      expect(catalog.explore.logColumns.actions).toBeTruthy();
      expect(catalog.explore.logColumns.insertLeft).toBeTruthy();
      expect(catalog.explore.logColumns.insertRight).toBeTruthy();
      expect(catalog.explore.logColumns.replace).toBeTruthy();
      expect(catalog.explore.logColumns.remove).toBeTruthy();
      expect(catalog.explore.logColumns.remove).toContain('{{field}}');
      expect(catalog.explore.logColumns.addColumn).toBeTruthy();
      expect(catalog.explore.logColumns.empty).toBeTruthy();
      expect(catalog.explore.logColumns.reorderHint).toBeTruthy();
      expect(catalog.explore.logCopy.copyTimestamp).toBeTruthy();
      expect(catalog.explore.logCopy.copyMessageDescription).toBeTruthy();
      expect(catalog.explore.logCopy.copyJsonDescription).toBeTruthy();
    }
  });

  it.each(Object.entries(catalogFamilies.root))(
    '%s saved-query copy has no literal unicode escape text',
    (_locale, catalog) => {
      expect(JSON.stringify(catalog.exploreSaved)).not.toMatch(/\\u[0-9a-f]{4}/iu);
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
