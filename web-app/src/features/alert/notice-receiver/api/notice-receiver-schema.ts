/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { createSpringPageSchema } from '@/shared/pagination';

import {
  activeNoticeReceiverDefinition,
  noticeReceiverAgentIdMax,
  noticeReceiverLarkReceiveTypes,
  noticeReceiverSecretKeyCatalog,
  noticeReceiverSecretKeys,
  noticeReceiverTypes,
  noticeReceiverWebhookAuthTypes,
  type FeiShuReceiveType,
  type NoticeReceiverOptionKey,
  type NoticeReceiverSecretKey,
  type NoticeReceiverType
} from '../model/notice-receiver-catalog';
import type { NoticeReceiverOptions, NoticeReceiverQuery } from '../model/notice-receiver-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0, 'Expected a positive integer');
const nullableTextSchema = z
  .string()
  .nullish()
  .transform(value => value ?? null);
const configuredSecretSchema = z
  .array(z.enum(noticeReceiverSecretKeyCatalog))
  .refine(items => new Set(items).size === items.length);

export const noticeReceiverTypeSchema = z.custom<NoticeReceiverType>(value =>
  noticeReceiverTypes.some(type => type === value)
);

// Receiver responses are strict because an unexpected field may be an echoed
// credential. Reject it before React Query or component state can retain it.
const noticeReceiverSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string(),
    type: noticeReceiverTypeSchema,
    typeKey: z.string(),
    // Option keys and values depend on the receiver type. The schema establishes
    // the object boundary; the API mapper applies the type-specific allowlist.
    options: z.record(z.string(), z.unknown()),
    configuredSecrets: z.array(z.string()),
    creator: nullableTextSchema,
    modifier: nullableTextSchema,
    gmtCreate: nullableTextSchema,
    gmtUpdate: nullableTextSchema
  })
  .strict();

const noticeReceiverPageSchema = createSpringPageSchema(noticeReceiverSchema);

export const noticeReceiverOptionSchema = z
  .object({
    id: positiveIntegerSchema,
    name: z.string(),
    type: noticeReceiverTypeSchema
  })
  .strict();

const noticeReceiverMutationSchema = z
  .object({
    id: positiveIntegerSchema,
    status: z.enum(['created', 'updated', 'deleted', 'missing']),
    receiver: noticeReceiverSchema.nullable()
  })
  .strict();

export class NoticeReceiverContractError extends Error {
  readonly code = 'NOTICE_RECEIVER_RESPONSE_INVALID';

  constructor(message = 'Invalid notice receiver response', options?: ErrorOptions) {
    super(message, options);
    this.name = 'NoticeReceiverContractError';
  }
}

export function parseNoticeReceiverWire(value: unknown) {
  return parseStructuredNoticeReceiver(parseSchema(noticeReceiverSchema, value, 'Notice receiver'));
}

export function parseNoticeReceiverPageWire(value: unknown, query: NoticeReceiverQuery) {
  const page = parseSchema(noticeReceiverPageSchema, value, 'Notice receiver page');
  requireSpringPageIdentity(page, query);
  return { ...page, content: page.content.map(parseStructuredNoticeReceiver) };
}

export function parseNoticeReceiverOptionsWire(value: unknown) {
  return parseSchema(z.array(noticeReceiverOptionSchema), value, 'Notice receiver options');
}

export function parseNoticeReceiverMutationWire(value: unknown) {
  const mutation = parseSchema(noticeReceiverMutationSchema, value, 'Notice receiver mutation');
  return {
    ...mutation,
    receiver: mutation.receiver === null ? null : parseStructuredNoticeReceiver(mutation.receiver)
  };
}

function parseStructuredNoticeReceiver(source: z.output<typeof noticeReceiverSchema>): NoticeReceiverWire {
  const optionSchema = noticeReceiverOptionSchemas.get(source.type);
  if (!optionSchema) throw new NoticeReceiverContractError();
  const optionResult = optionSchema.safeParse(source.options);
  const secretResult = configuredSecretSchema.safeParse(source.configuredSecrets);
  if (!optionResult.success || !secretResult.success) throw new NoticeReceiverContractError();
  const allowedSecrets = noticeReceiverSecretKeys(source.type);
  if (secretResult.data.some(secret => !allowedSecrets.includes(secret))) throw new NoticeReceiverContractError();
  return {
    ...source,
    options: optionResult.data,
    configuredSecrets: [...secretResult.data]
  };
}

const larkReceiveTypeSchema = z.custom<FeiShuReceiveType>(value =>
  noticeReceiverLarkReceiveTypes.some(type => type === value)
);

const noticeReceiverOptionSchemas = new Map<NoticeReceiverType, z.ZodType<NoticeReceiverOptions>>(
  noticeReceiverTypes.map(type => {
    const shape = Object.fromEntries(
      activeNoticeReceiverDefinition(type)
        .fields.filter(field => !field.secret)
        .map(field => [field.key, noticeReceiverOptionValueSchema(field.key).optional()])
    );
    const schema: z.ZodType<NoticeReceiverOptions> = z.object(shape).strict();
    return [type, schema] as const;
  })
);

function noticeReceiverOptionValueSchema(key: NoticeReceiverOptionKey) {
  if (key === 'agentId') return safeIntegerSchema.nonnegative().max(noticeReceiverAgentIdMax);
  if (key === 'hookAuthType') return z.enum(noticeReceiverWebhookAuthTypes);
  if (key === 'larkReceiveType') return larkReceiveTypeSchema;
  return z.string();
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new NoticeReceiverContractError(`${label} did not match the response contract`, { cause: result.error });
}

function requireSpringPageIdentity(page: z.output<typeof noticeReceiverPageSchema>, query: NoticeReceiverQuery) {
  if (page.number !== query.pageIndex || page.size !== query.pageSize) throw new NoticeReceiverContractError();
  const expectedTotalPages = page.totalElements === 0 ? 0 : Math.ceil(page.totalElements / page.size);
  if (page.totalPages !== expectedTotalPages) throw new NoticeReceiverContractError();
  // Spring permits an out-of-range page, but every in-range snapshot must carry
  // exactly the rows implied by its authoritative total.
  const remaining = page.number >= page.totalPages ? 0 : page.totalElements - page.number * page.size;
  const expectedContentSize = Math.max(0, Math.min(page.size, remaining));
  if (page.content.length !== expectedContentSize) throw new NoticeReceiverContractError();
  if (new Set(page.content.map(receiver => receiver.id)).size !== page.content.length) {
    throw new NoticeReceiverContractError();
  }
}

export type NoticeReceiverWire = Omit<z.output<typeof noticeReceiverSchema>, 'options' | 'configuredSecrets'> & {
  options: NoticeReceiverOptions;
  configuredSecrets: NoticeReceiverSecretKey[];
};
