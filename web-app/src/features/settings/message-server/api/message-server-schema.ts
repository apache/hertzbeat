/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { smsSecrets } from '../model/message-server-contract';

const nonemptyTextSchema = z.string().refine(value => Boolean(value.trim()), 'Expected nonempty text');
const revisionSchema = nonemptyTextSchema.refine(value => value !== 'missing', 'Expected configured revision');

// These objects are strict because read responses must contain configuration
// metadata only. A password echoed by the backend is a contract violation.
const emailConfigSchema = z
  .object({
    type: z.number().int(),
    emailHost: nonemptyTextSchema,
    emailUsername: nonemptyTextSchema,
    emailPort: z.number().int().min(1).max(65_535),
    emailSsl: z.boolean(),
    emailStarttls: z.boolean(),
    enable: z.boolean(),
    configuredSecrets: z
      .array(z.literal('emailPassword'))
      .refine(values => new Set(values).size === values.length, 'Expected unique values')
  })
  .strict();

const emailEvidenceSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('configured'), revision: revisionSchema, config: emailConfigSchema }).strict(),
  z.object({ status: z.literal('missing'), revision: z.literal('missing'), config: z.null() }).strict()
]);

// SmsServerConfigOptions is serialized with the application's ALWAYS null
// inclusion. Write-only secrets are absent; all read-safe fields are present.
const smsOptionsSchema = z
  .object({
    appId: z.string().nullable(),
    signName: z.string().nullable(),
    templateId: z.string().nullable(),
    accessKeyId: z.string().nullable(),
    templateCode: z.string().nullable(),
    signature: z.string().nullable(),
    authMode: z.string().nullable(),
    region: z.string().nullable(),
    accountSid: z.string().nullable(),
    twilioPhoneNumber: z.string().nullable()
  })
  .strict();

const smsConfigSchema = z
  .object({
    enable: z.boolean(),
    type: z.enum(['tencent', 'alibaba', 'unisms', 'smslocal', 'aws', 'twilio']),
    options: smsOptionsSchema,
    configuredSecrets: z
      .array(z.enum(smsSecrets))
      .refine(values => new Set(values).size === values.length, 'Expected unique values')
  })
  .strict();

const smsEvidenceSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('configured'), revision: revisionSchema, config: smsConfigSchema }).strict(),
  z.object({ status: z.literal('missing'), revision: z.literal('missing'), config: z.null() }).strict()
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
