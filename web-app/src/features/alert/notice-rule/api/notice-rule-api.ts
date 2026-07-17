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
  apiMessagePut,
  type PageResult
} from '@/core/http/api-message';

import { loadAllNoticeReceiverOptions } from '../../notice-receiver/api/notice-receiver-api';
import type { NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../notice-template-model';
import {
  buildNoticeRuleListPath,
  buildNoticeRulePayload,
  noticeRulePageSizes,
  type NoticeRule,
  type NoticeRuleDraft,
  type NoticeRuleQuery
} from '../model/notice-rule-model';

export class NoticeRuleContractError extends Error {
  constructor(readonly code: string) {
    super('Notice rule response invalid');
    this.name = 'NoticeRuleContractError';
  }
}

export async function loadNoticeRules(query: NoticeRuleQuery) {
  const page = await apiMessageGet<PageResult<NoticeRule>>(buildNoticeRuleListPath(query));
  return assertNoticeRulePage(page, query);
}

export async function loadNoticeRule(id: number) {
  return assertNoticeRule(await apiMessageGet<NoticeRule>(`/api/notice/rule/${id}`), id);
}

export async function loadAllNoticeReceivers() {
  const receivers = await loadAllNoticeReceiverOptions();
  if (receivers.some(item => item.id < 1) || new Set(receivers.map(item => item.id)).size !== receivers.length) {
    throw new NoticeRuleContractError('NOTICE_RULE_RECEIVER_OPTIONS_INVALID');
  }
  return receivers;
}

export async function loadAllNoticeTemplates() {
  const templates = await apiMessageGet<NoticeTemplate[]>('/api/notice/templates/all');
  if (!Array.isArray(templates) || templates.some(item => !isNoticeTemplate(item))) {
    throw new NoticeRuleContractError('NOTICE_RULE_TEMPLATE_OPTIONS_INVALID');
  }
  const ids = templates.flatMap(item => item.id == null ? [] : [item.id]);
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

export function saveNoticeRule(
  draft: NoticeRuleDraft,
  receivers: NoticeReceiverOption[],
  templates: NoticeTemplate[]
) {
  const payload = buildNoticeRulePayload(draft, receivers, templates);
  return draft.id
    ? apiMessagePut<void>('/api/notice/rule', payload)
    : apiMessagePost<void>('/api/notice/rule', payload);
}

export function deleteNoticeRule(id: number) {
  return apiMessageDelete<void>(`/api/notice/rule/${id}`);
}

export function isNoticeRuleMissing(error: unknown) {
  return error instanceof ApiMessageError && error.code === 15;
}

function assertNoticeRulePage(value: PageResult<NoticeRule>, query: NoticeRuleQuery) {
  if (!value || !Array.isArray(value.content) || value.number !== query.pageIndex || value.size !== query.pageSize
    || !Number.isSafeInteger(value.totalElements) || value.totalElements < value.content.length
    || !Number.isSafeInteger(value.totalPages) || value.totalPages < 0
    || value.totalPages !== Math.ceil(value.totalElements / query.pageSize)
    || value.content.length > query.pageSize
    || value.content.some(item => !isNoticeRule(item))) {
    throw new NoticeRuleContractError('NOTICE_RULE_PAGE_INVALID');
  }
  return value;
}

function assertNoticeRule(value: NoticeRule, id: number) {
  if (!isNoticeRule(value) || value.id !== id) {
    throw new NoticeRuleContractError('NOTICE_RULE_DETAIL_INVALID');
  }
  return value;
}

function isNoticeRule(value: unknown): value is NoticeRule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rule = value as Partial<NoticeRule>;
  const allowed = ['id', 'name', 'receiverId', 'receiverName', 'templateId', 'templateName', 'enable',
    'filterAll', 'labels', 'days', 'periodStart', 'periodEnd', 'creator', 'modifier', 'gmtCreate', 'gmtUpdate'];
  return [
    Object.keys(rule).every(key => allowed.includes(key)),
    isNoticeRuleIdentity(rule),
    isNoticeRuleRouting(rule),
    isNoticeRuleSchedule(rule),
    isNoticeRuleAudit(rule)
  ].every(Boolean);
}

function isNoticeTemplate(value: unknown): value is NoticeTemplate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const template = value as Partial<NoticeTemplate>;
  const allowed = ['id', 'name', 'type', 'preset', 'content', 'creator', 'modifier', 'gmtCreate', 'gmtUpdate'];
  return [
    Object.keys(template).every(key => allowed.includes(key)),
    isOptionalPositiveId(template.id),
    typeof template.name === 'string',
    isReceiverType(template.type),
    typeof template.preset === 'boolean',
    typeof template.content === 'string',
    isNullableString(template.creator),
    isNullableString(template.modifier),
    isDateValue(template.gmtCreate),
    isDateValue(template.gmtUpdate)
  ].every(Boolean);
}

function isNoticeRuleIdentity(rule: Partial<NoticeRule>) {
  return [isPositiveId(rule.id), typeof rule.name === 'string', typeof rule.enable === 'boolean',
    typeof rule.filterAll === 'boolean'].every(Boolean);
}

function isNoticeRuleRouting(rule: Partial<NoticeRule>) {
  if (!Array.isArray(rule.receiverId) || !Array.isArray(rule.receiverName)) return false;
  return [rule.receiverId.every(isPositiveId), rule.receiverName.every(name => typeof name === 'string'),
    rule.receiverId.length === rule.receiverName.length, isOptionalPositiveId(rule.templateId),
    isNullableString(rule.templateName), isStringRecord(rule.labels)].every(Boolean);
}

function isNoticeRuleSchedule(rule: Partial<NoticeRule>) {
  const daysValid = rule.days == null || Array.isArray(rule.days)
    && rule.days.every(day => Number.isSafeInteger(day) && day >= 1 && day <= 7);
  return [daysValid, isDateValue(rule.periodStart), isDateValue(rule.periodEnd)].every(Boolean);
}

function isNoticeRuleAudit(rule: Partial<NoticeRule>) {
  return [isNullableString(rule.creator), isNullableString(rule.modifier),
    isDateValue(rule.gmtCreate), isDateValue(rule.gmtUpdate)].every(Boolean);
}

function isPositiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isOptionalPositiveId(value: unknown) {
  return value == null || isPositiveId(value);
}

function isReceiverType(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 14;
}

function isStringRecord(value: unknown) {
  return value == null || typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every(item => typeof item === 'string');
}

function isNullableString(value: unknown) {
  return value == null || typeof value === 'string';
}

function isDateValue(value: unknown) {
  return value == null || typeof value === 'string' || typeof value === 'number';
}
