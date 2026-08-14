/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { springPageSchema } from './agent-gateway-schema';

export const agentScheduleSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    instruction: z.string().min(1),
    cronExpression: z.string().min(1),
    enabled: z.boolean(),
    sessionId: z.number().int().positive().nullable(),
    receiverIds: z.array(z.number().int().positive()),
    templateId: z.number().int().positive().nullable(),
    createdFromSessionUid: z.string().nullable(),
    lastTriggerAt: z.number().int().nonnegative().nullable(),
    nextTriggerAt: z.number().int().nonnegative().nullable(),
    creator: z.string().nullable(),
    modifier: z.string().nullable(),
    gmtCreate: z.string().nullable(),
    gmtUpdate: z.string().nullable()
  })
  .passthrough();

export const agentSchedulePageSchema = springPageSchema(agentScheduleSchema);

export const agentScheduleOptionSchema = z
  .object({ id: z.number().int().positive(), name: z.string().min(1), type: z.number().int().nonnegative() })
  .passthrough();

export const agentScheduleTemplateSchema = z
  .object({ id: z.number().int().positive().nullable(), name: z.string().min(1), type: z.number().int().nonnegative() })
  .passthrough();

export const agentScheduleRunSchema = z.object({ runUid: z.string().min(1), status: z.string().min(1) }).passthrough();

export const agentScheduleTranscriptSchema = springPageSchema(
  z
    .object({
      id: z.number().int().positive(),
      sessionSequence: z.number().int().positive(),
      payloadJson: z.string(),
      messageRole: z.string().min(1),
      gmtCreate: z.string().nullable()
    })
    .passthrough()
);
