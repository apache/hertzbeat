/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import type {
  PublicStatusComponent,
  PublicStatusIncident,
  PublicStatusIncidentComponent,
  PublicStatusIncidentPage,
  PublicStatusOrg,
  PublicStatusOrgState
} from '../model/public-status-contract';
import { PublicStatusContractError } from '../model/public-status-contract';
import {
  nullablePublicStatusText,
  nullablePublicStatusTime,
  publicComponentState,
  publicIncidentState,
  publicStatusComponentInfoSchema,
  publicStatusHistorySchema,
  publicStatusIncidentContentSchema,
  publicStatusNonNegativeInteger,
  publicStatusPositiveInteger,
  publicStatusSafeInteger,
  requiredPublicStatusText,
  safePublicStatusFeedback,
  safePublicStatusUrl
} from './public-status-evidence-schema';

const publicStatusOrgWireSchema = z
  .object({
    id: publicStatusPositiveInteger.nullable().optional(),
    name: requiredPublicStatusText,
    description: requiredPublicStatusText,
    home: safePublicStatusUrl,
    logo: safePublicStatusUrl,
    feedback: safePublicStatusFeedback,
    color: nullablePublicStatusText,
    state: publicStatusSafeInteger,
    creator: nullablePublicStatusText,
    modifier: nullablePublicStatusText,
    gmtCreate: nullablePublicStatusTime,
    gmtUpdate: nullablePublicStatusTime
  })
  .strict()
  .transform((value): PublicStatusOrg => ({
    name: value.name,
    description: value.description,
    home: value.home,
    logo: value.logo,
    ...(value.feedback == null ? {} : { feedback: value.feedback }),
    state: publicOrgState(value.state),
    ...(value.color == null ? {} : { color: value.color })
  }));

const publicStatusComponentWireSchema = z
  .object({
    info: publicStatusComponentInfoSchema,
    history: z.array(publicStatusHistorySchema).nullable()
  })
  .strict()
  .transform(({ info, history }): PublicStatusComponent => ({
    id: info.id,
    name: info.name,
    ...(info.description == null ? {} : { description: info.description }),
    state: publicComponentState(info.state),
    history
  }));

const publicStatusIncidentSchema = z
  .object({
    id: publicStatusPositiveInteger,
    orgId: publicStatusPositiveInteger.nullable().optional(),
    name: requiredPublicStatusText,
    state: publicStatusSafeInteger,
    startTime: publicStatusPositiveInteger.nullable().optional(),
    endTime: publicStatusPositiveInteger.nullable().optional(),
    creator: nullablePublicStatusText,
    modifier: nullablePublicStatusText,
    gmtCreate: nullablePublicStatusTime,
    gmtUpdate: nullablePublicStatusTime,
    components: z.array(publicStatusComponentInfoSchema).nullable(),
    contents: z.array(publicStatusIncidentContentSchema).nullable()
  })
  .strict()
  .transform((value): PublicStatusIncident => ({
    id: value.id,
    name: value.name,
    state: publicIncidentState(value.state),
    ...(value.startTime == null ? {} : { startTime: value.startTime }),
    ...(value.endTime == null ? {} : { endTime: value.endTime }),
    components:
      value.components?.map((component): PublicStatusIncidentComponent => ({
        id: component.id,
        name: component.name,
        ...(component.description == null ? {} : { description: component.description }),
        state: publicComponentState(component.state)
      })) ?? null,
    contents: value.contents
  }));

const publicStatusIncidentPageSchema = z
  .object({
    content: z.array(publicStatusIncidentSchema),
    totalElements: publicStatusNonNegativeInteger,
    totalPages: publicStatusNonNegativeInteger,
    number: publicStatusNonNegativeInteger,
    size: publicStatusPositiveInteger,
    pageable: z.unknown().optional(),
    last: z.boolean().optional(),
    sort: z.unknown().optional(),
    first: z.boolean().optional(),
    numberOfElements: z.number().int().nonnegative().optional(),
    empty: z.boolean().optional()
  })
  .strict()
  .transform(({ content, totalElements, totalPages, number, size }): PublicStatusIncidentPage => ({
    content,
    totalElements,
    totalPages,
    number,
    size
  }));

export const parsePublicStatusOrg = (value: unknown) => parse(publicStatusOrgWireSchema, value);
export const parsePublicStatusComponents = (value: unknown) => {
  const components = parse(z.array(publicStatusComponentWireSchema), value);
  components.forEach(component => {
    if (
      component.history &&
      (new Set(component.history.map(item => item.timestamp)).size !== component.history.length ||
        component.history.some(item => item.componentId !== component.id))
    ) {
      throw new PublicStatusContractError();
    }
  });
  return components;
};
export const parsePublicStatusIncidents = (value: unknown) => {
  const page = parse(publicStatusIncidentPageSchema, value);
  page.content.forEach(assertIncidentRelations);
  return page;
};

export { PublicStatusContractError } from '../model/public-status-contract';

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new PublicStatusContractError();
  return result.data;
}

function assertIncidentRelations(incident: PublicStatusIncident) {
  const componentIds = incident.components?.map(component => component.id) ?? [];
  const contentIds = incident.contents?.map(content => content.id) ?? [];
  if (new Set(componentIds).size !== componentIds.length || new Set(contentIds).size !== contentIds.length) {
    throw new PublicStatusContractError();
  }
  if (incident.contents?.some(content => content.incidentId !== incident.id)) {
    throw new PublicStatusContractError();
  }
}

// Persisted backend byte codes are a compatibility boundary; future values must remain unknown evidence.
function publicOrgState(value: number): PublicStatusOrgState {
  if (value === 0) return 'healthy';
  if (value === 1) return 'degraded';
  if (value === 2) return 'incident';
  return 'unknown';
}
