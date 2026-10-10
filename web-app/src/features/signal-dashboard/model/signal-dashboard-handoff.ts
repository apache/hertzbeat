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
import { parseHertzBeatDashboardDocument, type HertzBeatDashboardDocument } from '@/platform/perses';
import { safeDashboardExploreReturnPath } from '@/shared/navigation/signal-dashboard-paths';
import type { ExactTimeWindow } from '@/shared/query-context';

export type IncomingDashboardPanel = {
  document: HertzBeatDashboardDocument;
  timeWindow: ExactTimeWindow;
  returnTo: string;
};
const handoffSchema = z
  .object({
    version: z.literal(1),
    document: z.unknown(),
    timeWindow: z
      .object({ from: z.number().int().positive().safe(), to: z.number().int().positive().safe() })
      .strict()
      .refine(window => window.to > window.from && window.to - window.from <= 86400000),
    returnTo: z.string()
  })
  .strict();

export function readDashboardPanelHandoff(value: unknown): IncomingDashboardPanel | undefined {
  const parsed = handoffSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const returnTo = safeDashboardExploreReturnPath(parsed.data.returnTo);
  if (!returnTo) return undefined;
  const params = new URLSearchParams(returnTo.split('?')[1]);
  if (
    Number(params.get('start')) !== parsed.data.timeWindow.from ||
    Number(params.get('end')) !== parsed.data.timeWindow.to
  )
    return undefined;
  try {
    const document = parseHertzBeatDashboardDocument(parsed.data.document);
    return Object.keys(document.spec.panels).length === 1
      ? { document, timeWindow: parsed.data.timeWindow, returnTo }
      : undefined;
  } catch {
    return undefined;
  }
}
