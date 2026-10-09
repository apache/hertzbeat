/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
const count = z.number().int().nonnegative().safe();
const windowSchema = z.object({ start: count, end: count }).strict();
export { logFacetFieldSchema, type LogFacetField } from '@/shared/log-field';
import { logFacetFieldSchema } from '@/shared/log-field';
export const logFacetFieldsSchema = z
  .object({
    state: z.enum(['ready', 'unavailable']),
    window: windowSchema,
    coverage: z
      .object({
        mode: z.literal('bounded_rows'),
        rowLimit: z.literal(1000),
        scannedRows: count.nullable(),
        hasMore: z.boolean().nullable()
      })
      .strict(),
    fields: z.array(logFacetFieldSchema).max(200),
    truncated: z.boolean()
  })
  .strict()
  .refine(result =>
    result.state === 'ready'
      ? result.coverage.scannedRows !== null && result.coverage.scannedRows <= 1000 && result.coverage.hasMore !== null
      : result.coverage.scannedRows === null &&
        result.coverage.hasMore === null &&
        result.fields.length === 0 &&
        !result.truncated
  );
export const logFacetValueSearchSchema = z
  .string()
  .max(256)
  .refine(value => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value));
export const logFacetValuesSchema = z
  .object({
    state: z.enum(['ready', 'unavailable']),
    window: windowSchema,
    field: logFacetFieldSchema,
    coverage: z.object({ mode: z.literal('full_window') }).strict(),
    matchedCount: count.nullable(),
    missingOrNullCount: count.nullable(),
    search: z
      .object({ query: logFacetValueSearchSchema.min(1), matchedCount: count.nullable() })
      .strict()
      .nullish(),
    values: z.array(z.object({ value: z.string(), count: count.positive() }).strict()).max(100),
    truncated: z.boolean()
  })
  .strict()
  .refine(validValueCounts);
export type LogFacetFieldsResult = z.infer<typeof logFacetFieldsSchema>;
export type LogFacetValuesResult = z.infer<typeof logFacetValuesSchema>;
type ValueCounts = {
  state: string;
  matchedCount: number | null;
  missingOrNullCount: number | null;
  values: Array<{ value: string; count: number }>;
  truncated: boolean;
  search?: { query: string; matchedCount: number | null } | null | undefined;
};

function validValueCounts(result: ValueCounts) {
  if (result.state === 'unavailable') return unavailableValueCounts(result);
  if (result.matchedCount === null || result.missingOrNullCount === null) return false;
  if (new Set(result.values.map(item => item.value)).size !== result.values.length) return false;
  const population = result.matchedCount - result.missingOrNullCount;
  const matching = result.search ? result.search.matchedCount : population;
  if (matching === null || matching > population || population < 0) return false;
  const represented = result.values.reduce((sum, item) => sum + item.count, 0);
  return result.truncated ? represented <= matching : represented === matching;
}

function unavailableValueCounts(result: ValueCounts) {
  return (
    result.matchedCount === null &&
    result.missingOrNullCount === null &&
    result.values.length === 0 &&
    (!result.search || result.search.matchedCount === null) &&
    !result.truncated
  );
}
