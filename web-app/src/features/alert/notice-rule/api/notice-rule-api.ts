/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  ApiMessageError,
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut
} from '@/core/http/api-message';

import { loadAllNoticeReceiverOptions } from '../../notice-receiver/api/notice-receiver-api';
import type { NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../notice-template-model';
import {
  buildNoticeRuleListPath,
  buildNoticeRulePayload,
  noticeRulePageSizes,
  type NoticeRuleDraft,
  type NoticeRuleQuery
} from '../model/notice-rule-model';
import {
  NoticeRuleContractError,
  parseNoticeRule,
  parseNoticeRulePage,
  parseNoticeTemplates
} from './notice-rule-schema';

export { NoticeRuleContractError } from './notice-rule-schema';

export async function loadNoticeRules(query: NoticeRuleQuery) {
  return parseNoticeRulePage(await apiMessageGet(buildNoticeRuleListPath(query)), query);
}

export async function loadNoticeRule(id: number) {
  return parseNoticeRule(await apiMessageGet(`/api/notice/rule/${id}`), id);
}

export async function loadAllNoticeReceivers() {
  const receivers = await loadAllNoticeReceiverOptions();
  if (receivers.some(item => item.id < 1) || new Set(receivers.map(item => item.id)).size !== receivers.length) {
    throw new NoticeRuleContractError('NOTICE_RULE_RECEIVER_OPTIONS_INVALID');
  }
  return receivers;
}

export async function loadAllNoticeTemplates() {
  const templates = parseNoticeTemplates(await apiMessageGet('/api/notice/templates/all'));
  const ids = templates.flatMap(item => (item.id == null ? [] : [item.id]));
  if (new Set(ids).size !== ids.length) throw new NoticeRuleContractError('NOTICE_RULE_TEMPLATE_OPTIONS_INVALID');
  return templates;
}

export async function loadAllNoticeRulesByName(name: string) {
  const pageSize = noticeRulePageSizes.at(-1)!;
  const first = await loadNoticeRules({ name, pageIndex: 0, pageSize });
  if (first.totalPages > 10_000) throw new NoticeRuleContractError('NOTICE_RULE_PAGE_COUNT_INVALID');
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

export function saveNoticeRule(draft: NoticeRuleDraft, receivers: NoticeReceiverOption[], templates: NoticeTemplate[]) {
  const payload = buildNoticeRulePayload(draft, receivers, templates);
  return draft.id ? apiMessagePut('/api/notice/rule', payload) : apiMessagePost('/api/notice/rule', payload);
}

export function deleteNoticeRule(id: number) {
  return apiMessageDelete(`/api/notice/rule/${id}`);
}

export function isNoticeRuleMissing(error: unknown) {
  return error instanceof ApiMessageError && error.code === 15;
}
