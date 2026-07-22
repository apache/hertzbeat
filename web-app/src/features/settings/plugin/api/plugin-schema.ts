/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import type { PluginPage, PluginQuery, PluginRecord } from '../model/plugin-model';

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
