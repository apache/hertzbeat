/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';

import type { StatusIncidentQuery } from '../model/status-incident-query';
import {
  StatusManagementContractError,
  StatusManagementMissingError,
  type StatusComponentRecord,
  type StatusIncidentPage,
  type StatusIncidentRecord,
  type StatusOrgRecord
} from '../model/status-management-contract';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0);
const requiredTextSchema = z.string().refine(value => value.trim().length > 0);
const nullableTextSchema = z.string().nullable().optional();
const nullablePositiveIntegerSchema = positiveIntegerSchema.nullable().optional();

const auditFields = {
  creator: nullableTextSchema,
  modifier: nullableTextSchema,
  gmtCreate: nullableTextSchema,
  gmtUpdate: nullableTextSchema
};

// Status page reads expose this DTO allowlist while ignoring unrelated backend metadata.
const statusOrgWireSchema = z.object({
  id: positiveIntegerSchema,
  name: requiredTextSchema,
  description: requiredTextSchema,
  home: requiredTextSchema,
  logo: requiredTextSchema,
  feedback: nullableTextSchema,
  color: nullableTextSchema,
  state: safeIntegerSchema.refine(value => value >= 0 && value <= 2),
  ...auditFields
});

const statusComponentWireSchema = z.object({
  id: positiveIntegerSchema,
  orgId: positiveIntegerSchema,
  name: requiredTextSchema,
  description: nullableTextSchema,
  labels: z.record(z.string(), z.string()).nullable().optional(),
  method: safeIntegerSchema.refine(value => value >= 0 && value <= 1),
  configState: safeIntegerSchema.refine(value => value >= 0 && value <= 2),
  state: safeIntegerSchema.refine(value => value >= 0 && value <= 2),
  ...auditFields
});

const statusIncidentContentWireSchema = z.object({
  id: positiveIntegerSchema,
  incidentId: positiveIntegerSchema,
  message: requiredTextSchema,
  state: safeIntegerSchema.refine(value => value >= 0 && value <= 3),
  timestamp: positiveIntegerSchema,
  ...auditFields
});

const statusIncidentWireSchema = z.object({
  id: positiveIntegerSchema,
  orgId: positiveIntegerSchema,
  name: requiredTextSchema,
  state: safeIntegerSchema.refine(value => value >= 0 && value <= 3),
  startTime: nullablePositiveIntegerSchema,
  endTime: nullablePositiveIntegerSchema,
  components: z.array(statusComponentWireSchema).nullable().optional(),
  contents: z.array(statusIncidentContentWireSchema).nullable().optional(),
  ...auditFields
});

const statusIncidentPageWireSchema = z.object({
  content: z.array(statusIncidentWireSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

export function parseStatusOrg(value: unknown): StatusOrgRecord {
  return mapStatusOrg(parseSchema(statusOrgWireSchema, value));
}

export function parseStatusComponents(value: unknown): StatusComponentRecord[] {
  const components = parseSchema(z.array(statusComponentWireSchema), value).map(mapStatusComponent);
  assertUniqueIds(components);
  return components;
}

export function parseStatusComponentDetail(value: unknown): StatusComponentRecord {
  if (value === null) throw new StatusManagementMissingError('component');
  return mapStatusComponent(parseSchema(statusComponentWireSchema, value));
}

export function parseStatusIncidentDetail(value: unknown): StatusIncidentRecord {
  if (value === null) throw new StatusManagementMissingError('incident');
  const incident = mapStatusIncident(parseSchema(statusIncidentWireSchema, value));
  validateIncidentRelations(incident);
  return incident;
}

export function parseStatusIncidentPage(value: unknown, query: StatusIncidentQuery): StatusIncidentPage {
  const wirePage = parseSchema(statusIncidentPageWireSchema, value);
  const page: StatusIncidentPage = {
    ...wirePage,
    content: wirePage.content.map(mapStatusIncident)
  };
  page.content.forEach(validateIncidentRelations);
  assertUniqueIds(page.content);

  // Structurally valid evidence for another request must never render as the current page.
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw new StatusManagementContractError();
  }
  const remainingElements = Math.max(0, page.totalElements - page.number * page.size);
  const expectedContentLength = Math.min(page.size, remainingElements);
  if (page.totalPages !== Math.ceil(page.totalElements / page.size) || page.content.length !== expectedContentLength) {
    throw new StatusManagementContractError();
  }
  return page;
}

function mapStatusOrg(wire: z.output<typeof statusOrgWireSchema>): StatusOrgRecord {
  return {
    id: wire.id,
    name: wire.name,
    description: wire.description,
    home: wire.home,
    logo: wire.logo,
    state: wire.state,
    ...(wire.feedback === undefined ? {} : { feedback: wire.feedback }),
    ...(wire.color === undefined ? {} : { color: wire.color }),
    ...mapAuditFields(wire)
  };
}

function mapStatusComponent(wire: z.output<typeof statusComponentWireSchema>): StatusComponentRecord {
  return {
    id: wire.id,
    orgId: wire.orgId,
    name: wire.name,
    method: wire.method,
    configState: wire.configState,
    state: wire.state,
    ...(wire.description === undefined ? {} : { description: wire.description }),
    ...(wire.labels === undefined ? {} : { labels: wire.labels }),
    ...mapAuditFields(wire)
  };
}

function mapStatusIncidentContent(wire: z.output<typeof statusIncidentContentWireSchema>) {
  return {
    id: wire.id,
    incidentId: wire.incidentId,
    message: wire.message,
    state: wire.state,
    timestamp: wire.timestamp,
    ...mapAuditFields(wire)
  };
}

function mapStatusIncident(wire: z.output<typeof statusIncidentWireSchema>): StatusIncidentRecord {
  return {
    id: wire.id,
    orgId: wire.orgId,
    name: wire.name,
    state: wire.state,
    ...(wire.startTime === undefined ? {} : { startTime: wire.startTime }),
    ...(wire.endTime === undefined ? {} : { endTime: wire.endTime }),
    ...(wire.components === undefined ? {} : { components: wire.components?.map(mapStatusComponent) ?? null }),
    ...(wire.contents === undefined ? {} : { contents: wire.contents?.map(mapStatusIncidentContent) ?? null }),
    ...mapAuditFields(wire)
  };
}

function mapAuditFields(wire: {
  creator?: string | null | undefined;
  modifier?: string | null | undefined;
  gmtCreate?: string | null | undefined;
  gmtUpdate?: string | null | undefined;
}) {
  return {
    ...(wire.creator === undefined ? {} : { creator: wire.creator }),
    ...(wire.modifier === undefined ? {} : { modifier: wire.modifier }),
    ...(wire.gmtCreate === undefined ? {} : { gmtCreate: wire.gmtCreate }),
    ...(wire.gmtUpdate === undefined ? {} : { gmtUpdate: wire.gmtUpdate })
  };
}

function validateIncidentRelations(incident: StatusIncidentRecord) {
  if (incident.components) {
    assertUniqueIds(incident.components);
    if (incident.components.some(component => component.orgId !== incident.orgId)) {
      throw new StatusManagementContractError();
    }
  }
  if (incident.contents) {
    assertUniqueIds(incident.contents);
    if (incident.contents.some(content => content.incidentId !== incident.id)) {
      throw new StatusManagementContractError();
    }
  }
}

function assertUniqueIds(records: readonly { id: number }[]) {
  if (new Set(records.map(record => record.id)).size !== records.length) {
    throw new StatusManagementContractError();
  }
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  // Do not retain Zod issues as a cause: union issues can contain rejected wire values.
  throw new StatusManagementContractError();
}
