/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { hasOwnProperties } from '@/shared/validation/own-properties';

import { noticeReceiverOptionSchema, noticeReceiverTypeSchema } from '../../notice-receiver/api/notice-receiver-schema';
import type { NoticeTemplate } from '../../notice-template-model';
import { NoticeRuleContractError } from '../model/notice-rule-failure';
import type { NoticeRule, NoticeRuleMutationVariables, NoticeRuleQuery } from '../model/notice-rule-model';

const positiveId = z.number().int().positive();
const nullableText = z.string().nullable().optional();
const dateValue = z.union([z.string(), z.number()]).nullable().optional();

const noticeRuleWireSchema = z
  .object({
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
  })
  .strict()
  .refine(rule => rule.receiverId.length === rule.receiverName.length);

const noticeTemplateWireSchema = z
  .object({
    id: positiveId.nullable().optional(),
    name: z.string(),
    type: noticeReceiverTypeSchema,
    preset: z.boolean(),
    content: z.string(),
    creator: nullableText,
    modifier: nullableText,
    gmtCreate: dateValue,
    gmtUpdate: dateValue
  })
  .strict();

const noticeRuleDraftSchema = z
  .object({
    id: positiveId.optional(),
    name: z.string(),
    receiverIds: z.array(positiveId),
    receiverNames: z.array(z.string()),
    templateId: positiveId.nullable(),
    templateName: z.string().nullable(),
    enable: z.boolean(),
    filterAll: z.boolean(),
    labelsText: z.string(),
    limitDays: z.boolean(),
    days: z.array(z.number().int().min(1).max(7)),
    periodStart: z.string(),
    periodEnd: z.string()
  })
  .strict();

const noticeRuleMutationVariablesSchema = z
  .object({
    draft: noticeRuleDraftSchema,
    receivers: z.array(noticeReceiverOptionSchema),
    templates: z.array(noticeTemplateWireSchema)
  })
  .strict()
  .superRefine((variables, context) => {
    if (
      new Set(variables.receivers.map(item => item.id)).size !== variables.receivers.length ||
      variables.receivers.some(item => item.id < 1)
    ) {
      context.addIssue({ code: 'custom', message: 'Receiver identities must be unique and positive' });
    }
    const templateIds = variables.templates.flatMap(item => (item.id == null ? [] : [item.id]));
    if (new Set(templateIds).size !== templateIds.length) {
      context.addIssue({ code: 'custom', message: 'Template identities must be unique' });
    }
  });

type NoticeRuleWire = z.infer<typeof noticeRuleWireSchema>;
type NoticeTemplateWire = z.infer<typeof noticeTemplateWireSchema>;

const noticeRuleSchema = noticeRuleWireSchema.transform(toNoticeRule);
const noticeTemplateSchema = noticeTemplateWireSchema.transform(toNoticeTemplate);

const noticeRulePageSchema = z
  .object({
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
  })
  .strict()
  .transform(({ content, totalElements, totalPages, number, size }) => ({
    content,
    totalElements,
    totalPages,
    number,
    size
  }));

export function parseNoticeRulePage(value: unknown, query: NoticeRuleQuery) {
  const page = parse(noticeRulePageSchema, value, 'NOTICE_RULE_PAGE_INVALID');
  const expectedContentSize = Math.max(0, Math.min(page.size, page.totalElements - page.number * page.size));
  if (
    page.number !== query.pageIndex ||
    page.size !== query.pageSize ||
    page.totalPages !== Math.ceil(page.totalElements / query.pageSize) ||
    page.content.length !== expectedContentSize ||
    new Set(page.content.map(rule => rule.id)).size !== page.content.length
  ) {
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

export function parseNoticeRuleMutationVariables(value: unknown): NoticeRuleMutationVariables {
  if (!hasOwnProperties(value, ['draft', 'receivers', 'templates'])) {
    throw new NoticeRuleContractError('NOTICE_RULE_VARIABLES_INVALID');
  }
  const parsed = parse(noticeRuleMutationVariablesSchema, value, 'NOTICE_RULE_VARIABLES_INVALID');
  const { id, ...draftWithoutId } = parsed.draft;
  const draft = id === undefined ? draftWithoutId : { ...draftWithoutId, id };
  return { draft, receivers: parsed.receivers, templates: parsed.templates.map(toNoticeTemplate) };
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
