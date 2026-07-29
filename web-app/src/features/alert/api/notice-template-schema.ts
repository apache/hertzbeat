/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { createSpringPageSchema } from '@/shared/pagination';

import { noticeReceiverTypes, type NoticeReceiverType } from '../notice-receiver/model/notice-receiver-catalog';
import {
  NoticeTemplateContractError,
  type NoticeTemplate,
  type NoticeTemplatePage,
  type NoticeTemplateQuery
} from '../model/notice-template-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);
const requiredTextSchema = z.string().refine(value => value.trim().length > 0);
const receiverTypeSchema = z.custom<NoticeReceiverType>(value => noticeReceiverTypes.some(type => type === value));
const nullableTextSchema = z.string().nullable().optional();
const nullableTimeSchema = z.union([z.string(), z.number().finite(), z.null()]).optional();

const templateFields = {
  name: requiredTextSchema,
  type: receiverTypeSchema,
  content: requiredTextSchema,
  creator: nullableTextSchema,
  modifier: nullableTextSchema,
  gmtCreate: nullableTimeSchema,
  gmtUpdate: nullableTimeSchema
};

const presetTemplateSchema = z
  .object({
    ...templateFields,
    id: positiveIntegerSchema.nullish(),
    preset: z.literal(true)
  })
  .strict();

const customTemplateSchema = z
  .object({
    ...templateFields,
    id: positiveIntegerSchema,
    preset: z.literal(false)
  })
  .strict();

const noticeTemplateSchema = z.discriminatedUnion('preset', [presetTemplateSchema, customTemplateSchema]);

const noticeTemplatePageSchema = createSpringPageSchema(noticeTemplateSchema);

export function parseNoticeTemplateDetailWire(value: unknown) {
  return mapNoticeTemplateWire(parseSchema(noticeTemplateSchema, value));
}

export function parseNoticeTemplatePageWire(value: unknown, query: NoticeTemplateQuery): NoticeTemplatePage {
  const page = parseSchema(noticeTemplatePageSchema, value);
  requireSpringPageEvidence(page, query);
  return { ...page, content: page.content.map(mapNoticeTemplateWire) };
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  // Never retain rejected template bodies, telemetry, or Zod input through an Error cause.
  throw new NoticeTemplateContractError();
}

function requireSpringPageEvidence(page: z.output<typeof noticeTemplatePageSchema>, query: NoticeTemplateQuery) {
  if (page.number !== query.pageIndex || page.size !== query.pageSize) throw new NoticeTemplateContractError();
  if (page.totalPages !== Math.ceil(page.totalElements / page.size)) throw new NoticeTemplateContractError();
  // Spring permits an out-of-range page, but an in-range response must match
  // the authoritative total and the requested preset/custom branch exactly.
  const expectedRows = Math.max(0, Math.min(page.size, page.totalElements - page.number * page.size));
  if (page.content.length !== expectedRows) throw new NoticeTemplateContractError();
  if (page.content.some(template => template.preset !== query.preset)) throw new NoticeTemplateContractError();
  requireUniqueTemplateEvidence(page.content);
}

function requireUniqueTemplateEvidence(content: z.output<typeof noticeTemplateSchema>[]) {
  const identities = content.map(template =>
    template.preset ? `preset:${template.type}:${template.name}` : `custom:${template.id}`
  );
  if (new Set(identities).size !== identities.length) throw new NoticeTemplateContractError();
}

function mapNoticeTemplateWire(wire: z.output<typeof noticeTemplateSchema>): NoticeTemplate {
  return {
    ...(wire.id === undefined ? {} : { id: wire.id }),
    name: wire.name,
    type: wire.type,
    preset: wire.preset,
    content: wire.content,
    ...(wire.creator === undefined ? {} : { creator: wire.creator }),
    ...(wire.modifier === undefined ? {} : { modifier: wire.modifier }),
    ...(wire.gmtCreate === undefined ? {} : { gmtCreate: wire.gmtCreate }),
    ...(wire.gmtUpdate === undefined ? {} : { gmtUpdate: wire.gmtUpdate })
  };
}
