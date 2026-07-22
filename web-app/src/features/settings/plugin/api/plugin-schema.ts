/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import type { PluginPage, PluginQuery, PluginRecord } from '../model/plugin-model';
import { pluginParamTypes, type PluginParamDefine, type PluginParam } from '../model/plugin-params-contract';

export class PluginContractError extends Error {
  constructor(message = 'Invalid plugin response') {
    super(message);
    this.name = 'PluginContractError';
  }
}

const safeInteger = z.number().refine(Number.isSafeInteger);
const positiveInteger = safeInteger.refine(value => value > 0);
const nonNegativeInteger = safeInteger.refine(value => value >= 0);
const safeText = z.string().refine(value => value === value.trim() && value.length > 0);
const nonBlankText = z.string().refine(value => value.trim().length > 0);
const pluginWire = z
  .object({
    id: positiveInteger,
    name: safeText,
    enableStatus: z.boolean(),
    creator: z.string().nullish(),
    gmtCreate: z.string().nullish(),
    items: z.array(z.unknown()).nullish(),
    paramCount: nonNegativeInteger.nullish()
  })
  .strict();
const pageWire = z.object({
  content: z.array(pluginWire),
  totalElements: nonNegativeInteger,
  totalPages: nonNegativeInteger,
  number: nonNegativeInteger,
  size: positiveInteger
});
const paramTypeWire = z.enum(pluginParamTypes);
const optionWire = z.object({ label: nonBlankText, value: safeText }).strict();
const defineWire = z
  .object({
    app: z.string().optional(),
    name: z.record(z.string(), z.string()).optional(),
    field: safeText,
    type: paramTypeWire,
    required: z.boolean(),
    defaultValue: z.string().optional(),
    placeholder: z.string().optional(),
    range: z.string().optional(),
    limit: nonNegativeInteger.optional(),
    options: z.array(optionWire).optional(),
    keyAlias: z.string().optional(),
    valueAlias: z.string().optional(),
    hide: z.boolean(),
    depend: z.record(z.string(), z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).optional()
  })
  .strict()
  .superRefine((define, context) => {
    if (define.type === 'password' && ('defaultValue' in define || 'placeholder' in define)) {
      context.addIssue({ code: 'custom', message: 'Password definition contains secret material' });
    }
    if (define.type === 'radio' || define.type === 'checkbox') {
      if (!define.options?.length)
        context.addIssue({ code: 'custom', path: ['options'], message: 'Choice options are required' });
      const optionValues = new Set<string>();
      define.options?.forEach((option, index) => {
        const normalized = option.value.toLowerCase();
        if (define.type === 'checkbox' && option.value.includes(','))
          context.addIssue({ code: 'custom', path: ['options', index, 'value'], message: 'Comma is not allowed' });
        if (optionValues.has(normalized))
          context.addIssue({ code: 'custom', path: ['options', index, 'value'], message: 'Duplicate option value' });
        optionValues.add(normalized);
      });
    }
  });
const paramWire = z
  .object({ field: safeText, type: paramTypeWire, value: z.string().optional(), configured: z.boolean() })
  .strict()
  .superRefine((param, context) => {
    if (param.type === 'password' && 'value' in param)
      context.addIssue({ code: 'custom', message: 'Password value exposed' });
    if (param.type !== 'password') {
      const hasValue = param.value !== undefined && param.value.trim().length > 0;
      if (param.configured !== hasValue)
        context.addIssue({ code: 'custom', path: ['configured'], message: 'Configured state does not match value' });
    }
  });
const paramDefinitionWire = z
  .object({ paramDefines: z.array(defineWire), pluginParams: z.array(paramWire) })
  .strict()
  .superRefine((data, context) => {
    const defines = new Map<string, string>();
    const params = new Set<string>();
    data.paramDefines.forEach((define, index) => {
      if (defines.has(define.field))
        context.addIssue({ code: 'custom', path: ['paramDefines', index, 'field'], message: 'Duplicate field' });
      defines.set(define.field, define.type);
    });
    data.pluginParams.forEach((param, index) => {
      if (params.has(param.field))
        context.addIssue({ code: 'custom', path: ['pluginParams', index, 'field'], message: 'Duplicate field' });
      params.add(param.field);
      if (defines.get(param.field) !== param.type)
        context.addIssue({
          code: 'custom',
          path: ['pluginParams', index, 'field'],
          message: 'Unknown or mismatched field'
        });
    });
    data.paramDefines.forEach((define, index) => {
      if (!params.has(define.field))
        context.addIssue({
          code: 'custom',
          path: ['paramDefines', index, 'field'],
          message: 'Missing parameter value'
        });
    });
  });
const ordinaryParamInput = z.object({ field: safeText, value: z.string() }).strict();
const passwordParamInput = z.discriminatedUnion('intent', [
  z.object({ field: safeText, intent: z.literal('KEEP') }).strict(),
  z.object({ field: safeText, intent: z.literal('CLEAR') }).strict(),
  z
    .object({
      field: safeText,
      intent: z.literal('REPLACE'),
      value: z.string().refine(value => value.trim().length > 0)
    })
    .strict()
]);
const paramWritePayload = z
  .object({ pluginMetadataId: positiveInteger, params: z.array(z.union([ordinaryParamInput, passwordParamInput])) })
  .strict();

export function parsePluginPage(value: unknown, request: PluginQuery): PluginPage {
  const result = pageWire.safeParse(value);
  if (!result.success) throw new PluginContractError();
  const page = result.data;
  const expectedSize = Math.max(0, Math.min(page.size, page.totalElements - page.number * page.size));
  const uniqueIds = new Set(page.content.map(plugin => plugin.id)).size === page.content.length;
  if (
    page.number !== request.pageIndex ||
    page.size !== request.pageSize ||
    page.totalPages !== Math.ceil(page.totalElements / page.size) ||
    page.content.length !== expectedSize ||
    !uniqueIds
  ) {
    throw new PluginContractError('Plugin page identity is invalid');
  }
  return { ...page, content: page.content.map(mapPlugin) };
}

export function parsePluginWriteReceipt(value: unknown) {
  const result = z.null().safeParse(value);
  if (!result.success) throw new PluginContractError();
  return result.data;
}

export function parsePluginParamDefinition(value: unknown): {
  paramDefines: PluginParamDefine[];
  pluginParams: PluginParam[];
} {
  const result = paramDefinitionWire.safeParse(value);
  if (!result.success) throw new PluginContractError();
  return {
    paramDefines: result.data.paramDefines.map(mapParamDefine),
    pluginParams: result.data.pluginParams.map(param => ({
      field: param.field,
      type: param.type,
      configured: param.configured,
      ...(param.value === undefined ? {} : { value: param.value })
    }))
  };
}

export function parsePluginParamWriteReceipt(value: unknown) {
  const result = z.literal(true).safeParse(value);
  if (!result.success) throw new PluginContractError();
  return result.data;
}

export function parsePluginParamWritePayload(value: unknown) {
  const result = paramWritePayload.safeParse(value);
  if (!result.success) throw new PluginContractError();
  return result.data;
}

function mapParamDefine(define: z.output<typeof defineWire>): PluginParamDefine {
  return {
    field: define.field,
    type: define.type,
    required: define.required,
    name: define.name ?? {},
    options: define.options ?? [],
    hide: define.hide,
    depend: define.depend ?? {},
    ...(define.app === undefined ? {} : { app: define.app }),
    ...(define.defaultValue === undefined ? {} : { defaultValue: define.defaultValue }),
    ...(define.placeholder === undefined ? {} : { placeholder: define.placeholder }),
    ...(define.range === undefined ? {} : { range: define.range }),
    ...(define.limit === undefined ? {} : { limit: define.limit }),
    ...(define.keyAlias === undefined ? {} : { keyAlias: define.keyAlias }),
    ...(define.valueAlias === undefined ? {} : { valueAlias: define.valueAlias })
  };
}

function mapPlugin(plugin: z.output<typeof pluginWire>): PluginRecord {
  return {
    id: plugin.id,
    name: plugin.name,
    enableStatus: plugin.enableStatus,
    ...(plugin.creator == null ? {} : { creator: plugin.creator }),
    ...(plugin.gmtCreate == null ? {} : { gmtCreate: plugin.gmtCreate }),
    ...(plugin.paramCount == null ? {} : { paramCount: plugin.paramCount })
  };
}
