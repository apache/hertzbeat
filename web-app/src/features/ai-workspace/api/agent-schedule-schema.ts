/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
