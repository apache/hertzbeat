/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import type { PluginPage, PluginQuery, PluginRecord } from '../model/plugin-model';
import { PluginContractError } from './plugin-contract-error';
export { PluginContractError } from './plugin-contract-error';

const safeInteger = z.number().refine(Number.isSafeInteger);
const positiveInteger = safeInteger.refine(value => value > 0);
const nonNegativeInteger = safeInteger.refine(value => value >= 0);
const safeText = z.string().refine(value => value === value.trim() && value.length > 0);
const sortWire = z.object({ empty: z.boolean(), sorted: z.boolean(), unsorted: z.boolean() }).strict();
const pluginItemWire = z
  .object({
    id: positiveInteger,
    classIdentifier: safeText,
    type: z.enum(['POST_ALERT', 'POST_COLLECT'])
  })
  .strict();
const pluginWire = z
  .object({
    id: positiveInteger,
    name: safeText,
    enableStatus: z.boolean(),
    creator: z.string().nullish(),
    gmtCreate: z.string().nullish(),
    items: z.array(pluginItemWire).nullish(),
    paramCount: nonNegativeInteger.nullish()
  })
  .strict();
const pageWire = z
  .object({
    content: z.array(pluginWire),
    pageable: z
      .object({
        pageNumber: nonNegativeInteger,
        pageSize: positiveInteger,
        sort: sortWire,
        offset: nonNegativeInteger,
        paged: z.boolean(),
        unpaged: z.boolean()
      })
      .strict(),
    last: z.boolean(),
    totalPages: nonNegativeInteger,
    totalElements: nonNegativeInteger,
    size: positiveInteger,
    number: nonNegativeInteger,
    sort: sortWire,
    first: z.boolean(),
    numberOfElements: nonNegativeInteger,
    empty: z.boolean()
  })
  .strict();

export function parsePluginPage(value: unknown, request: PluginQuery): PluginPage {
  const result = pageWire.safeParse(value);
  if (!result.success) throw new PluginContractError();
  const page = result.data;
  if (!validPageIdentity(page, request)) throw new PluginContractError('Plugin page identity is invalid');
  return {
    content: page.content.map(mapPlugin),
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    number: page.number,
    size: page.size
  };
}

function validPageIdentity(page: z.output<typeof pageWire>, request: PluginQuery) {
  const expectedSize = Math.max(0, Math.min(page.size, page.totalElements - page.number * page.size));
  const checks = [
    page.number === request.pageIndex,
    page.size === request.pageSize,
    page.totalPages === Math.ceil(page.totalElements / page.size),
    page.content.length === expectedSize,
    page.numberOfElements === page.content.length,
    page.empty === (page.content.length === 0),
    page.first === (page.number === 0),
    page.last === page.number + 1 >= page.totalPages,
    page.pageable.pageNumber === page.number,
    page.pageable.pageSize === page.size,
    page.pageable.offset === page.number * page.size,
    page.pageable.paged,
    !page.pageable.unpaged,
    new Set(page.content.map(plugin => plugin.id)).size === page.content.length
  ];
  return checks.every(Boolean);
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
