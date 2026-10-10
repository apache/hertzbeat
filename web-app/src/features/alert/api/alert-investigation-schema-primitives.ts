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

const JAVA_LONG_MAX = '9223372036854775807';

export const safeInteger = z.number().int().safe();
export const nonNegativeInteger = safeInteger.nonnegative();
export const positiveTimestamp = safeInteger.positive();
export const positiveLongDecimal = z
  .string()
  .regex(/^[1-9]\d{0,18}$/u)
  .refine(value => value.length < JAVA_LONG_MAX.length || value <= JAVA_LONG_MAX);
export const nonNegativeLongDecimal = z
  .string()
  .regex(/^(0|[1-9]\d{0,18})$/u)
  .refine(value => value.length < JAVA_LONG_MAX.length || value <= JAVA_LONG_MAX);

export const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum).refine(hasPrintableText);
export const nullableText = (maximum: number) => requiredText(maximum).nullable();
export const boundedMap = (entries: number, valueLength: number) =>
  z
    .record(requiredText(128), z.string().max(valueLength).refine(hasPrintableText))
    .refine(value => Object.keys(value).length <= entries);

function hasPrintableText(value: string) {
  return Array.from(value).every(character => {
    const code = character.charCodeAt(0);
    return code > 31 && code !== 127;
  });
}
