/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
