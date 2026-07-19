/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { noticeReceiverTypes, type NoticeReceiverType } from '../model/notice-receiver-catalog';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0, 'Expected a non-negative integer');
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0, 'Expected a positive integer');
const nullableTextSchema = z
  .string()
  .nullish()
  .transform(value => value ?? null);

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

const noticeReceiverPageSchema = z
  .object({
    content: z.array(noticeReceiverSchema),
    totalElements: nonNegativeIntegerSchema,
    totalPages: nonNegativeIntegerSchema,
    number: nonNegativeIntegerSchema,
    size: nonNegativeIntegerSchema
  })
  .strict();

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
  return parseSchema(noticeReceiverSchema, value, 'Notice receiver');
}

export function parseNoticeReceiverPageWire(value: unknown) {
  return parseSchema(noticeReceiverPageSchema, value, 'Notice receiver page');
}

export function parseNoticeReceiverOptionsWire(value: unknown) {
  return parseSchema(z.array(noticeReceiverOptionSchema), value, 'Notice receiver options');
}

export function parseNoticeReceiverMutationWire(value: unknown) {
  return parseSchema(noticeReceiverMutationSchema, value, 'Notice receiver mutation');
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new NoticeReceiverContractError(`${label} did not match the response contract`, { cause: result.error });
}

export type NoticeReceiverWire = z.output<typeof noticeReceiverSchema>;
