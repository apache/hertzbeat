/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { pluginParamTypes, type PluginParamDefine, type PluginParam } from '../model/plugin-params-contract';
import { PluginContractError } from './plugin-contract-error';

const safeInteger = z.number().refine(Number.isSafeInteger);
const positiveInteger = safeInteger.refine(value => value > 0);
const nonNegativeInteger = safeInteger.refine(value => value >= 0);
const safeText = z.string().refine(value => value === value.trim() && value.length > 0);
const nonBlankText = z.string().refine(value => value.trim().length > 0);
const paramTypeWire = z.enum(pluginParamTypes);
const optionWire = z.object({ label: nonBlankText, value: safeText }).strict();
const defineShape = z
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
  .strict();
const defineWire = defineShape.superRefine((define, context) => {
  if (define.type === 'password' && ('defaultValue' in define || 'placeholder' in define)) {
    context.addIssue({ code: 'custom', message: 'Password definition contains secret material' });
  }
  if (define.type === 'radio' || define.type === 'checkbox') validateChoiceOptions(define, context);
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
const paramDefinitionShape = z.object({ paramDefines: z.array(defineWire), pluginParams: z.array(paramWire) }).strict();
const paramDefinitionWire = paramDefinitionShape.superRefine(validateDefinitionIdentity);
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

function validateChoiceOptions(define: z.output<typeof defineShape>, context: z.RefinementCtx) {
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

function validateDefinitionIdentity(data: z.output<typeof paramDefinitionShape>, context: z.RefinementCtx) {
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
      context.addIssue({ code: 'custom', path: ['paramDefines', index, 'field'], message: 'Missing parameter value' });
  });
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
