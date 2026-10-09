/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { validLogColumns, type LogColumn } from '../model/log-column';
export const logViewSchema = z
  .object({
    version: z.literal(1),
    columns: z.custom<LogColumn[]>(validLogColumns),
    density: z.enum(['compact', 'comfortable']),
    wrap: z.boolean(),
    rowHeight: z.enum(['small', 'medium', 'large']).optional(),
    contentDisplay: z.enum(['message', 'attributes', 'stack']).optional(),
    showContent: z.boolean().optional(),
    standardizeHeaders: z.boolean().optional(),
    showTimeline: z.boolean().optional()
  })
  .strict();
export type LogView = z.infer<typeof logViewSchema>;
export function parseLogView(value: string): LogView {
  if (encodeURIComponent(value).length > 6000) throw new Error('Log view exceeds URL size limit');
  return logViewSchema.parse(JSON.parse(value));
}
export function encodeLogView(value: LogView) {
  const encoded = JSON.stringify(logViewSchema.parse(value));
  parseLogView(encoded);
  return encoded;
}
export function validLogView(value: string | undefined) {
  if (value === undefined) return true;
  try {
    parseLogView(value);
    return true;
  } catch {
    return false;
  }
}

export function resolveLogRowHeight(
  display: { rowHeight?: LogView['rowHeight']; wrap?: boolean | undefined } | undefined
) {
  const height = display?.rowHeight;
  if (height === 'small' || height === 'medium' || height === 'large') return height;
  return display?.wrap ? 'large' : 'small';
}
