/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { agentGatewayEventTypes } from '../model/agent-workspace-contract';

export const agentGatewayEventSchema = z
  .object({
    type: z.enum(agentGatewayEventTypes),
    eventId: z.string().min(1),
    conversationId: z.string().nullable(),
    sessionUid: z.string().nullable(),
    runUid: z.string().nullable(),
    itemId: z.string().nullable(),
    payload: z.record(z.string(), z.unknown()),
    timestamp: z.number().nonnegative()
  })
  .strict();

export const agentSessionSchema = z
  .object({
    id: z.number().int().positive(),
    sessionUid: z.string().min(1),
    conversationId: z.string().nullable(),
    status: z.string().min(1),
    title: z.string().nullable(),
    gmtCreate: z.string().nullable(),
    gmtUpdate: z.string().nullable()
  })
  .passthrough();

export const agentTranscriptEntrySchema = z
  .object({
    id: z.number().int().positive(),
    sessionSequence: z.number().int().positive(),
    payloadJson: z.string(),
    messageRole: z.enum(['user', 'assistant', 'toolResult', 'compactionSummary']),
    gmtCreate: z.string().nullable()
  })
  .passthrough();

export const transcriptPayloadSchema = z
  .object({
    role: z.enum(['user', 'assistant', 'toolResult', 'compactionSummary']),
    content: z.array(
      z
        .object({
          type: z.enum(['text', 'toolCall']),
          text: z.string().nullable().optional(),
          id: z.string().nullable().optional(),
          name: z.string().nullable().optional(),
          input: z.record(z.string(), z.unknown()).optional()
        })
        .passthrough()
    ),
    toolName: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional()
  })
  .passthrough();

export const agentProviderOptionSchema = z
  .object({
    type: z.string().min(1),
    code: z.string().min(1),
    label: z.string().min(1),
    defaultBaseUrl: z.string().nullable().default(null),
    defaultModel: z.string().nullable().default(null),
    requiredFields: z.array(z.string()).default([])
  })
  .strict();

export const agentProviderConfigurationViewSchema = z
  .object({
    activeProviderUid: z.string().nullable(),
    providers: z.array(
      z
        .object({
          uid: z.string().min(1),
          type: z.string().min(1),
          code: z.string().min(1),
          baseUrl: z.string().nullable(),
          model: z.string().nullable(),
          apiKeyConfigured: z.boolean()
        })
        .strict()
    )
  })
  .strict();

export const springPageSchema = <T extends z.ZodType>(item: T) =>
  z
    .object({
      content: z.array(item),
      totalElements: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      number: z.number().int().nonnegative(),
      size: z.number().int().nonnegative()
    })
    .passthrough();
