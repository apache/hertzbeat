/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';

import { loadAllNoticeReceiverOptions } from '../../notice-receiver/api/notice-receiver-api';
import type { NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../notice-template-model';
import {
  buildNoticeRulePayload,
  maximumNoticeRuleScanPages,
  noticeRulePageSizes,
  writeNoticeRuleQuery,
  type NoticeRuleDraft,
  type NoticeRuleQuery
} from '../model/notice-rule-model';
import { NoticeRuleContractError } from '../model/notice-rule-failure';
import { noticeRuleEndpoint, noticeRulesEndpoint, noticeTemplatesEndpoint } from '../../notice-api-endpoints';
import { noticeRuleApiRequest } from './notice-rule-api-failure';
import { parseNoticeRule, parseNoticeRulePage, parseNoticeTemplates } from './notice-rule-schema';

export async function loadNoticeRules(query: NoticeRuleQuery) {
  return noticeRuleApiRequest(
    async () =>
      parseNoticeRulePage(
        await apiMessageGet(`${noticeRulesEndpoint}?${writeNoticeRuleQuery(query).toString()}`),
        query
      ),
    'collection'
  );
}

export async function loadNoticeRule(id: number) {
  return noticeRuleApiRequest(
    async () => parseNoticeRule(await apiMessageGet(noticeRuleDetailEndpoint(id)), id),
    'detail'
  );
}

export async function loadAllNoticeReceivers() {
  return noticeRuleApiRequest(async () => {
    const receivers = await loadAllNoticeReceiverOptions();
    if (receivers.some(item => item.id < 1) || new Set(receivers.map(item => item.id)).size !== receivers.length) {
      throw new NoticeRuleContractError('NOTICE_RULE_RECEIVER_OPTIONS_INVALID');
    }
    return receivers;
  }, 'collection');
}

export async function loadAllNoticeTemplates() {
  return noticeRuleApiRequest(async () => {
    const templates = parseNoticeTemplates(await apiMessageGet(`${noticeTemplatesEndpoint}/all`));
    const ids = templates.flatMap(item => (item.id == null ? [] : [item.id]));
    if (new Set(ids).size !== ids.length) throw new NoticeRuleContractError('NOTICE_RULE_TEMPLATE_OPTIONS_INVALID');
    return templates;
  }, 'collection');
}

export async function loadAllNoticeRulesByName(name: string) {
  const pageSize = noticeRulePageSizes.at(-1)!;
  const first = await loadNoticeRules({ name, pageIndex: 0, pageSize });
  if (first.totalPages > maximumNoticeRuleScanPages) {
    throw new NoticeRuleContractError('NOTICE_RULE_PAGE_COUNT_INVALID');
  }
  const pages = [first];
  for (let pageIndex = 1; pageIndex < first.totalPages; pageIndex += 1) {
    const page = await loadNoticeRules({ name, pageIndex, pageSize });
    if (page.totalElements !== first.totalElements || page.totalPages !== first.totalPages) {
      throw new NoticeRuleContractError('NOTICE_RULE_PAGE_SET_CHANGED');
    }
    pages.push(page);
  }
  const records = pages.flatMap(page => page.content);
  if (records.length !== first.totalElements || new Set(records.map(rule => rule.id)).size !== records.length) {
    throw new NoticeRuleContractError('NOTICE_RULE_FULL_SCAN_INVALID');
  }
  return records;
}

export async function saveNoticeRule(
  draft: NoticeRuleDraft,
  receivers: NoticeReceiverOption[],
  templates: NoticeTemplate[]
) {
  const payload = buildNoticeRulePayload(draft, receivers, templates);
  return noticeRuleApiRequest(
    () => (draft.id ? apiMessagePut(noticeRuleEndpoint, payload) : apiMessagePost(noticeRuleEndpoint, payload)),
    'write'
  );
}

export function deleteNoticeRule(id: number) {
  return noticeRuleApiRequest(() => apiMessageDelete(noticeRuleDetailEndpoint(id)), 'write');
}

function noticeRuleDetailEndpoint(id: number) {
  return `${noticeRuleEndpoint}/${id}`;
}
