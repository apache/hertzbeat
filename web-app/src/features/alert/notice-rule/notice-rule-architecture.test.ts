/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import advancedFields from './components/notice-rule-advanced-fields.tsx?raw';
import editor from './components/notice-rule-editor.tsx?raw';
import controller from './controller/notice-rule-controller.ts?raw';
import queryKeys from './controller/notice-rule-query-keys.ts?raw';
import readController from './controller/notice-rule-read-controller.ts?raw';
import resource from './notice-rule-resource.ts?raw';
import page from './pages/notice-rule-page.tsx?raw';

describe('notice rule architecture', () => {
  it('keeps transport, query state, and resource hooks out of pages and components', () => {
    for (const source of [page, editor, advancedFields]) {
      expect(source).not.toMatch(/@tanstack\/react-query|@refinedev\/core|apiMessage|notice-rule-api|useSearchParams/);
    }
    expect(readController).toMatch(/useList/);
    expect(readController).toMatch(/useQuery/);
    expect(controller).not.toMatch(/useList|useQuery|resolveNoticeRuleListState/);
    expect(controller).toMatch(/useDataProvider/);
    expect(controller).not.toMatch(/apiMessage/);
  });

  it('uses named Query Keys for direct queries and a URL identity for Refine list refresh failures', () => {
    expect(readController).toContain('noticeRuleQueryKeys.receiverOptions()');
    expect(readController).toContain('noticeRuleQueryKeys.templateOptions()');
    expect(readController).toContain('writeNoticeRuleQuery(query).toString()');
    expect(readController).not.toMatch(/queryKey\s*:\s*\[/);
  });

  it('keeps the shared Refine resource identity outside the Query Key factory', () => {
    expect(resource).toContain("noticeRuleResourceName = 'notice-rules'");
    expect(controller).toContain("from '../notice-rule-resource'");
    expect(readController).toContain("from '../notice-rule-resource'");
    expect(queryKeys).not.toContain('noticeRuleResourceName');
  });

  it('splits advanced matching and delivery presentation without changing patch contracts', () => {
    expect(editor).toContain("from './notice-rule-advanced-fields'");
    expect(editor).toContain('<NoticeRuleAdvancedFields draft={draft} update={update} />');
    expect(editor).not.toMatch(/noticeRuleWeekdays|TimePicker|Checkbox|periodHelp|limitDays|filterAll/);
    expect(advancedFields).toContain('<NoticeRuleMatchFields draft={draft} update={update} />');
    expect(advancedFields).toContain('<NoticeRuleDeliveryWindow draft={draft} update={update} />');
    expect(advancedFields).toContain('onChange={filterAll => update({ filterAll })}');
    expect(advancedFields).toContain('if (limitDays)');
    expect(advancedFields).toContain('update({ limitDays, days: [1, 2, 3, 4, 5, 6, 7] })');
    expect(advancedFields).toContain('onChange={changeDayLimit}');
    expect(advancedFields).toContain('noticeRuleWeekdays.map');
    expect(advancedFields.match(/allowClear/g)).toHaveLength(2);
    expect(advancedFields.match(/format="HH:mm"/g)).toHaveLength(2);
    expect(advancedFields.match(/minuteStep=\{5\}/g)).toHaveLength(2);
    expect(advancedFields).toContain("periodStart: value?.format('HH:mm') ?? ''");
    expect(advancedFields).toContain("periodEnd: value?.format('HH:mm') ?? ''");
    expect(advancedFields).toContain("t('noticeRules.periodHelp')");
    expect(advancedFields).not.toMatch(/controller|notice-rule-api|useSearchParams|@tanstack\/react-query/);
  });
});
