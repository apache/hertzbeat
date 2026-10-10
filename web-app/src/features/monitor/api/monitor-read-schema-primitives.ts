/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
export const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);
export const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0);
export const nullablePositiveIntegerSchema = positiveIntegerSchema.nullable();
export const nullableNonNegativeIntegerSchema = nonNegativeIntegerSchema.nullable();
export const javaByteSchema = safeIntegerSchema.refine(value => value >= 0 && value <= 127);
export const monitorStatusSchema = safeIntegerSchema.refine(value => value >= 0 && value <= 4);
export const nonEmptyStringSchema = z.string().refine(value => value.trim().length > 0);
export const nullableStringSchema = z.string().nullable();
export const nullableStringMapSchema = z.record(z.string(), z.string()).nullable();

// Java currently serializes LocalDateTime as text. Numeric timestamps remain
// accepted only because the pre-migration frontend contract supported them.
export const timestampSchema = z.union([z.string(), z.number().finite()]);
export const nullableTimestampSchema = timestampSchema.nullable();
