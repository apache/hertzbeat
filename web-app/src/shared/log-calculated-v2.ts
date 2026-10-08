/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';

const id = z.string().regex(/^c[1-9][0-9]{0,3}$/u);
const formulaName = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/u);
const captureName = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/u);
const boundedText = (bytes: number) =>
  z
    .string()
    .min(1)
    .refine(value => new TextEncoder().encode(value).byteLength <= bytes);
const formula = z.object({ id, kind: z.literal('formula'), name: formulaName, expression: boundedText(1024) }).strict();
const extraction = z
  .object({
    id,
    kind: z.literal('extraction'),
    engine: z.enum(['regex', 'grok']),
    source: z
      .string()
      .max(266)
      .regex(
        /^(?:builtin:(?:body|serviceName|environment|severityCategory)|(?:resource|attribute):[A-Za-z0-9_.:-]{1,256})$/u
      ),
    pattern: boundedText(256),
    captures: z
      .array(z.object({ name: captureName }).strict())
      .min(1)
      .max(8)
  })
  .strict();

const schema = z
  .object({
    version: z.literal(2),
    nextFieldSeq: z.number().int().min(1).max(10000),
    fields: z
      .array(z.discriminatedUnion('kind', [formula, extraction]))
      .min(1)
      .max(8)
  })
  .strict()
  .refine(value => {
    const ids = value.fields.map(field => field.id);
    const names = value.fields.flatMap(field =>
      field.kind === 'formula' ? [field.name] : field.captures.map(capture => capture.name)
    );
    return (
      new Set(ids).size === ids.length &&
      new Set(names).size === names.length &&
      names.length <= 16 &&
      ids.every(fieldId => Number(fieldId.slice(1)) < value.nextFieldSeq)
    );
  });

export type LogCalculatedV2 = z.infer<typeof schema>;
export function parseLogCalculatedV2(raw: string | undefined): LogCalculatedV2 | undefined {
  if (!raw || raw.length > 16384) return undefined;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
