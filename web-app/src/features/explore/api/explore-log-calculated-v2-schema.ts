/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { logRowSchema } from './explore-log-schema';
import {
  executedDefinitions,
  executedField,
  scalar,
  sameEntries,
  sameExecutedDefinitions,
  validDerived
} from './explore-log-calculated-v2-executed';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import type {
  CalculatedPageRequest,
  CalculatedFacetRequest,
  CalculatedValidationRequest
} from './explore-log-calculated-v2-types';

const natural = z.number().int().safe().nonnegative();
const positive = natural.positive();
const pageResponse = z
  .object({
    version: z.literal(2),
    window: z.object({ start: natural, end: positive }).strict(),
    executed: z
      .object({
        parameters: z.record(z.string(), z.string()),
        calculatedFields: executedDefinitions,
        operation: z
          .object({
            kind: z.literal('page'),
            pageIndex: natural,
            pageSize: positive.max(100),
            sort: z
              .object({
                field: z.string(),
                direction: z.enum(['asc', 'desc']),
                type: z.enum(['number', 'text']).optional()
              })
              .strict()
          })
          .strict()
      })
      .strict(),
    result: z
      .object({
        kind: z.literal('page'),
        totalElements: natural,
        rows: z.array(z.object({ log: logRowSchema, derived: z.record(z.string(), scalar) }).strict()).max(100)
      })
      .strict()
  })
  .strict();

const facetResponse = z
  .object({
    version: z.literal(2),
    window: z.object({ start: natural, end: positive }).strict(),
    executed: z
      .object({
        parameters: z.record(z.string(), z.string()),
        calculatedFields: executedDefinitions,
        operation: z
          .object({
            kind: z.literal('facet'),
            field: z.string(),
            limit: positive.max(100),
            valueSearch: z.string().optional()
          })
          .strict()
      })
      .strict(),
    result: z
      .object({
        kind: z.literal('facet'),
        field: z.string(),
        matchingTotal: natural,
        missingOrNullCount: natural,
        values: z
          .array(z.object({ value: z.union([z.number().finite(), z.string(), z.boolean()]), count: positive }).strict())
          .max(100),
        truncated: z.boolean(),
        search: z.object({ query: z.string(), matchedCount: natural }).strict().optional()
      })
      .strict()
  })
  .strict();

const validationResponse = z
  .object({
    version: z.literal(2),
    valid: z.boolean(),
    executedDefinitions: executedDefinitions.nullable(),
    preview: z
      .object({ definitionId: z.string(), values: z.record(z.string(), scalar) })
      .strict()
      .nullable(),
    errors: z.array(z.object({ path: z.string(), code: z.string() }).strict())
  })
  .strict();

export function parseCalculatedPageResponse(value: unknown, request: CalculatedPageRequest) {
  const parsed = pageResponse.safeParse(value);
  if (!parsed.success) throw new ExploreSignalContractError('Invalid calculated page');
  const data = parsed.data;
  if (!validPageEnvelope(data, request)) throw new ExploreSignalContractError('Calculated page does not match request');
  const remaining = Math.max(0, data.result.totalElements - request.operation.pageIndex * request.operation.pageSize);
  if (data.result.rows.length !== Math.min(remaining, request.operation.pageSize))
    throw new ExploreSignalContractError('Calculated page content is invalid');
  const names = data.executed.calculatedFields.fields.flatMap(field => field.outputs);
  for (const row of data.result.rows) {
    if (
      Object.keys(row.derived).length !== names.length ||
      names.some(item => !validDerived(row.derived[item.name], item.type))
    )
      throw new ExploreSignalContractError('Calculated values do not match executed outputs');
  }
  return data;
}

export function parseCalculatedFacetResponse(value: unknown, request: CalculatedFacetRequest) {
  const parsed = facetResponse.safeParse(value);
  if (!parsed.success) throw new ExploreSignalContractError('Invalid calculated facet');
  const data = parsed.data;
  if (!validFacetEnvelope(data, request) || !validFacetValues(data, request))
    throw new ExploreSignalContractError('Calculated facet does not match request');
  return data;
}

function validFacetEnvelope(data: z.infer<typeof facetResponse>, request: CalculatedFacetRequest) {
  return (
    data.window.start === Number(request.parameters.start) &&
    data.window.end === Number(request.parameters.end) &&
    sameEntries(data.executed.parameters, request.parameters) &&
    sameEntries(data.executed.operation, request.operation) &&
    sameExecutedDefinitions(data.executed.calculatedFields.fields, request.calculatedFields.fields) &&
    data.result.field === request.operation.field &&
    (request.operation.valueSearch ?? '') === (data.result.search?.query ?? '')
  );
}

function validFacetValues(data: z.infer<typeof facetResponse>, request: CalculatedFacetRequest) {
  const field = request.operation.field;
  const name = field.startsWith('calculated:') ? field.slice('calculated:'.length) : undefined;
  const output = name
    ? data.executed.calculatedFields.fields.flatMap(item => item.outputs).find(item => item.name === name)
    : undefined;
  const type = output?.type ?? 'string';
  return (
    (!name || output !== undefined) &&
    (request.operation.valueSearch === undefined || type === 'string') &&
    data.result.values.length <= request.operation.limit &&
    data.result.values.every(item => typeof item.value === type) &&
    new Set(data.result.values.map(item => JSON.stringify(item.value))).size === data.result.values.length &&
    validFacetPopulation(data.result)
  );
}

function validFacetPopulation(result: z.infer<typeof facetResponse>['result']) {
  const population = result.matchingTotal - result.missingOrNullCount;
  const searched = result.search?.matchedCount ?? population;
  const represented = result.values.reduce((sum, item) => sum + item.count, 0);
  return (
    population >= 0 && searched <= population && (result.truncated ? represented <= searched : represented === searched)
  );
}

export function parseCalculatedValidationResponse(value: unknown, request: CalculatedValidationRequest) {
  const parsed = validationResponse.safeParse(value);
  if (!parsed.success) throw new ExploreSignalContractError('Invalid calculated validation result');
  const data = parsed.data;
  if (!data.valid) {
    if (data.executedDefinitions !== null || data.preview !== null || !data.errors.length)
      throw new ExploreSignalContractError('Invalid calculated validation result');
    return data;
  }
  if (!validExecutedValidation(data, request))
    throw new ExploreSignalContractError('Calculated validation does not match request');
  const fields = data.executedDefinitions!.fields;
  if (!request.preview && data.preview !== null) throw new ExploreSignalContractError('Unexpected calculated preview');
  if (request.preview && !validPreview(data.preview, request.preview.definitionId, fields))
    throw new ExploreSignalContractError('Invalid calculated preview');
  return data;
}

function validExecutedValidation(data: z.infer<typeof validationResponse>, request: CalculatedValidationRequest) {
  const fields = data.executedDefinitions?.fields;
  return Boolean(
    fields && data.errors.length === 0 && sameExecutedDefinitions(fields, request.calculatedFields.fields)
  );
}

function validPreview(
  preview: z.infer<typeof validationResponse>['preview'],
  id: string,
  fields: z.infer<typeof executedField>[]
) {
  const field = fields.find(item => item.id === id);
  if (!preview || preview.definitionId !== id || field?.kind !== 'extraction') return false;
  return (
    Object.keys(preview.values).length === field.outputs.length &&
    field.outputs.every(item => validDerived(preview.values[item.name], item.type))
  );
}

function validPageEnvelope(data: z.infer<typeof pageResponse>, request: CalculatedPageRequest) {
  const executed = data.executed.calculatedFields.fields;
  return (
    data.window.start === Number(request.parameters.start) &&
    data.window.end === Number(request.parameters.end) &&
    sameEntries(data.executed.parameters, request.parameters) &&
    sameEntries(data.executed.operation, request.operation) &&
    sameExecutedDefinitions(executed, request.calculatedFields.fields)
  );
}
