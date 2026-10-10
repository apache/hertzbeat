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

import type { DashboardResource } from '@perses-dev/client';
import { z } from 'zod';

import { dashboardLayoutSchema, dashboardPanelIdSchema, validDashboardLayout } from './hertzbeat-dashboard-layout';
import { dashboardDisplaySchema, dashboardPanelSchema } from './hertzbeat-dashboard-panel';
import { validQueryVariables } from './hertzbeat-dashboard-query';
import { dashboardPlainTextSchema } from './hertzbeat-dashboard-text';
import { dashboardVariablesSchema } from './hertzbeat-dashboard-variables';

const tagsSchema = z
  .array(
    dashboardPlainTextSchema
      .min(1)
      .max(64)
      .refine(value => value.trim() === value)
  )
  .max(16)
  .refine(tags => new Set(tags).size === tags.length && JSON.stringify(tags).length <= 512);
const timezoneSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z][A-Za-z0-9_+./-]*$/u)
  .refine(value => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  });
const documentSchema = z
  .object({
    kind: z.literal('Dashboard'),
    metadata: z
      .object({
        name: z.string().regex(/^[A-Za-z0-9_.-]{1,75}$/u),
        project: z.literal('hertzbeat'),
        tags: tagsSchema.optional()
      })
      .strict(),
    spec: z
      .object({
        display: dashboardDisplaySchema,
        duration: z.enum(['15m', '30m', '1h', '6h', '24h']),
        refreshInterval: z.enum(['0s', '30s', '1m']).optional(),
        timezone: timezoneSchema.optional(),
        variables: dashboardVariablesSchema,
        panels: z
          .preprocess(
            (value, context) => {
              if (value !== null && typeof value === 'object' && Object.hasOwn(value, '__proto__')) {
                context.addIssue({ code: 'custom', message: 'Reserved panel identifier' });
              }
              return value;
            },
            z.record(dashboardPanelIdSchema, dashboardPanelSchema)
          )
          .refine(panels => Object.keys(panels).length <= 24),
        layouts: z.tuple([dashboardLayoutSchema])
      })
      .strict()
  })
  .strict()
  .refine(
    document => validDashboardLayout(document.spec.layouts[0], Object.keys(document.spec.panels)),
    'Layout must contain every panel exactly once without overlap'
  )
  .refine(document => {
    const names = new Set<string>(document.spec.variables.map(variable => variable.spec.name));
    return Object.values(document.spec.panels).every(panel =>
      validQueryVariables(panel.spec.queries[0].spec.plugin.spec.query, names)
    );
  }, 'Unsupported or unresolved variable reference');

export type HertzBeatDashboardDocument = z.infer<typeof documentSchema> & DashboardResource;

export function parseHertzBeatDashboardDocument(value: unknown): HertzBeatDashboardDocument {
  z.json().parse(value);
  if (new TextEncoder().encode(JSON.stringify(value)).length > 65_535) {
    throw new Error('Dashboard document exceeds the UTF-8 storage limit');
  }
  // JSON validation excludes undefined optional values permitted by Zod inference.
  return documentSchema.parse(value) as HertzBeatDashboardDocument;
}
