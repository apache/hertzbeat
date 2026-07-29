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

import type {
  AlertIntegrationCatalog,
  AlertIntegrationCatalogItem,
  AlertIntegrationGuide
} from '../model/alert-integration-model';
import { AlertIntegrationContractError } from '../model/alert-integration-model';

const readinessSchema = z.enum(['ready', 'configuration_required', 'guide_blocked']);
const sourceSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const localeKeySchema = z.string().regex(/^alert\.integration\.[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/);
const stringListSchema = z.array(z.string().trim().min(1));
const iconKeySchema = z.enum([
  'hertzbeat',
  'prometheus',
  'skywalking',
  'uptime-kuma',
  'zabbix',
  'tencent',
  'alibabacloud',
  'huaweicloud',
  'volcengine'
]);
const catalogItemSchema = z
  .object({
    source: sourceSchema,
    displayNameKey: localeKeySchema,
    iconKey: iconKeySchema,
    readiness: readinessSchema,
    limitations: z.array(localeKeySchema)
  })
  .strict();
const guideSchema = catalogItemSchema
  .extend({
    method: z.literal('POST'),
    ingressPath: z.string().regex(/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/),
    payloadShape: z.string().regex(/^[a-z0-9_]+$/),
    requiredHeaders: z.object({ Authorization: z.literal('Bearer {token}') }).strict(),
    requiredFields: stringListSchema.min(1),
    steps: z.array(localeKeySchema).min(1),
    snippets: z.array(z.string().min(1)),
    acknowledgement: localeKeySchema
  })
  .strict();
const catalogSchema = z.object({ items: z.array(catalogItemSchema).min(1) }).strict();

export function parseAlertIntegrationCatalog(value: unknown): AlertIntegrationCatalog {
  const catalog = parse(catalogSchema, value);
  if (new Set(catalog.items.map(item => item.source)).size !== catalog.items.length) {
    throw new AlertIntegrationContractError();
  }
  return catalog as AlertIntegrationCatalog;
}

export function parseAlertIntegrationGuide(value: unknown, source: string): AlertIntegrationGuide {
  const guide = parse(guideSchema, value) as AlertIntegrationGuide;
  if (guide.source !== source) throw new AlertIntegrationContractError();
  return guide;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new AlertIntegrationContractError();
  return result.data;
}

export type { AlertIntegrationCatalogItem };
export { AlertIntegrationContractError };
