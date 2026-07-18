/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { noticeReceiverTypeSchema } from '../../notice-receiver/api/notice-receiver-schema';
import type { NoticeTemplate } from '../../notice-template-model';
import type { NoticeRule, NoticeRuleQuery } from '../model/notice-rule-model';

const positiveId = z.number().int().positive();
const nullableText = z.string().nullable().optional();
const dateValue = z.union([z.string(), z.number()]).nullable().optional();

const noticeRuleWireSchema = z.object({
  id: positiveId,
  name: z.string(),
  receiverId: z.array(positiveId),
  receiverName: z.array(z.string()),
  templateId: positiveId.nullable(),
  templateName: z.string().nullable(),
  enable: z.boolean(),
  filterAll: z.boolean(),
  labels: z.record(z.string(), z.string()).nullable().optional(),
  days: z.array(z.number().int().min(1).max(7)).nullable().optional(),
  periodStart: dateValue,
  periodEnd: dateValue,
  creator: nullableText,
  modifier: nullableText,
  gmtCreate: dateValue,
  gmtUpdate: dateValue
}).strict().refine(rule => rule.receiverId.length === rule.receiverName.length);

const noticeTemplateWireSchema = z.object({
  id: positiveId.nullable().optional(),
  name: z.string(),
  type: noticeReceiverTypeSchema,
  preset: z.boolean(),
  content: z.string(),
  creator: nullableText,
  modifier: nullableText,
  gmtCreate: dateValue,
  gmtUpdate: dateValue
}).strict();

type NoticeRuleWire = z.infer<typeof noticeRuleWireSchema>;
type NoticeTemplateWire = z.infer<typeof noticeTemplateWireSchema>;

const noticeRuleSchema = noticeRuleWireSchema.transform(toNoticeRule);
const noticeTemplateSchema = noticeTemplateWireSchema.transform(toNoticeTemplate);

const noticeRulePageSchema = z.object({
  content: z.array(noticeRuleSchema),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  pageable: z.unknown().optional(),
  last: z.boolean().optional(),
  sort: z.unknown().optional(),
  first: z.boolean().optional(),
  numberOfElements: z.number().int().nonnegative().optional(),
  empty: z.boolean().optional()
}).strict().transform(({ content, totalElements, totalPages, number, size }) => ({
  content,
  totalElements,
  totalPages,
  number,
  size
}));

export class NoticeRuleContractError extends Error {
  constructor(readonly code: string) {
    super('Notice rule response invalid');
    this.name = 'NoticeRuleContractError';
  }
}

export function parseNoticeRulePage(value: unknown, query: NoticeRuleQuery) {
  const page = parse(noticeRulePageSchema, value, 'NOTICE_RULE_PAGE_INVALID');
  if (page.number !== query.pageIndex || page.size !== query.pageSize
    || page.totalElements < page.content.length
    || page.totalPages !== Math.ceil(page.totalElements / query.pageSize)
    || page.content.length > query.pageSize) {
    throw new NoticeRuleContractError('NOTICE_RULE_PAGE_INVALID');
  }
  return page;
}

export function parseNoticeRule(value: unknown, id: number): NoticeRule {
  const rule = parse(noticeRuleSchema, value, 'NOTICE_RULE_DETAIL_INVALID');
  if (rule.id !== id) throw new NoticeRuleContractError('NOTICE_RULE_DETAIL_INVALID');
  return rule;
}

export function parseNoticeTemplates(value: unknown): NoticeTemplate[] {
  return parse(z.array(noticeTemplateSchema), value, 'NOTICE_RULE_TEMPLATE_OPTIONS_INVALID');
}

function parse<T>(schema: z.ZodType<T>, value: unknown, code: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new NoticeRuleContractError(code);
  return result.data;
}

function toNoticeRule(value: NoticeRuleWire): NoticeRule {
  const rule: NoticeRule = {
    id: value.id,
    name: value.name,
    receiverId: value.receiverId,
    receiverName: value.receiverName,
    templateId: value.templateId,
    templateName: value.templateName,
    enable: value.enable,
    filterAll: value.filterAll
  };
  copyOptionalRuleFields(rule, value);
  return rule;
}

function copyOptionalRuleFields(rule: NoticeRule, value: NoticeRuleWire) {
  if (value.labels !== undefined) rule.labels = value.labels;
  if (value.days !== undefined) rule.days = value.days;
  if (value.periodStart !== undefined) rule.periodStart = value.periodStart;
  if (value.periodEnd !== undefined) rule.periodEnd = value.periodEnd;
  if (value.creator !== undefined) rule.creator = value.creator;
  if (value.modifier !== undefined) rule.modifier = value.modifier;
  if (value.gmtCreate !== undefined) rule.gmtCreate = value.gmtCreate;
  if (value.gmtUpdate !== undefined) rule.gmtUpdate = value.gmtUpdate;
}

function toNoticeTemplate(value: NoticeTemplateWire): NoticeTemplate {
  const template: NoticeTemplate = {
    name: value.name,
    type: value.type,
    preset: value.preset,
    content: value.content
  };
  if (value.id !== undefined) template.id = value.id;
  if (value.creator !== undefined) template.creator = value.creator;
  if (value.modifier !== undefined) template.modifier = value.modifier;
  if (value.gmtCreate !== undefined) template.gmtCreate = value.gmtCreate;
  if (value.gmtUpdate !== undefined) template.gmtUpdate = value.gmtUpdate;
  return template;
}
