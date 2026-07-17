/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

const nonemptyTextSchema = z.string().refine(value => Boolean(value.trim()), 'Expected nonempty text');
const uniqueStringsSchema = z.array(z.string())
  .refine(values => new Set(values).size === values.length, 'Expected unique values');

const emailConfigSchema = z.object({
  type: z.number().int(),
  emailHost: nonemptyTextSchema,
  emailUsername: nonemptyTextSchema,
  emailPort: z.number().int().min(1).max(65_535),
  emailSsl: z.boolean(),
  emailStarttls: z.boolean(),
  enable: z.boolean(),
  configuredSecrets: z.array(z.literal('emailPassword'))
    .refine(values => new Set(values).size === values.length, 'Expected unique values')
}).strict();

const emailEvidenceSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('configured'), config: emailConfigSchema }).strict(),
  z.object({ status: z.literal('missing'), config: z.null() }).strict()
]);

const smsConfigSchema = z.object({
  enable: z.boolean(),
  type: z.enum(['tencent', 'alibaba', 'unisms', 'smslocal', 'aws', 'twilio']),
  options: z.record(z.string(), z.unknown()),
  configuredSecrets: uniqueStringsSchema
}).strict();

const smsEvidenceSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('configured'), config: smsConfigSchema }).strict(),
  z.object({ status: z.literal('missing'), config: z.null() }).strict()
]);

export class MessageServerContractError extends Error {
  readonly code = 'MESSAGE_SERVER_RESPONSE_INVALID';

  constructor(message = 'Invalid message server response', options?: ErrorOptions) {
    super(message, options);
    this.name = 'MessageServerContractError';
  }
}

export function parseEmailEvidenceWire(value: unknown) {
  return parseSchema(emailEvidenceSchema, value, 'Email server evidence');
}

export function parseSmsEvidenceWire(value: unknown) {
  return parseSchema(smsEvidenceSchema, value, 'SMS server evidence');
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new MessageServerContractError(`${label} did not match the response contract`, { cause: result.error });
}

export type SmsEvidenceWire = z.output<typeof smsEvidenceSchema>;
