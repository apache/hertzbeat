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

import type { StatusIncidentQuery } from './status-incident-query';

type AuditFields = {
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type StatusOrg = AuditFields & {
  id?: number;
  name: string;
  description: string;
  home: string;
  logo: string;
  feedback?: string | null;
  color?: string | null;
  state: number;
};

export type StatusOrgRecord = StatusOrg & { id: number };

export type StatusComponent = AuditFields & {
  id?: number;
  orgId: number;
  name: string;
  description?: string | null;
  labels?: Record<string, string> | null;
  method: number;
  configState: number;
  state: number;
};

export type StatusComponentRecord = StatusComponent & { id: number };

export type StatusIncidentContent = AuditFields & {
  id?: number;
  incidentId?: number;
  message: string;
  state: number;
  timestamp: number;
};

export type StatusIncidentContentRecord = StatusIncidentContent & {
  id: number;
  incidentId: number;
};

export type StatusIncident = AuditFields & {
  id?: number;
  orgId: number;
  name: string;
  state: number;
  startTime?: number | null;
  endTime?: number | null;
  components?: StatusComponent[] | null;
  contents?: StatusIncidentContent[] | null;
};

export type StatusIncidentRecord = Omit<StatusIncident, 'components' | 'contents'> & {
  id: number;
  components?: StatusComponentRecord[] | null;
  contents?: StatusIncidentContentRecord[] | null;
};

export type StatusIncidentPage = {
  content: StatusIncidentRecord[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class StatusManagementContractError extends Error {
  constructor() {
    super('Status Management response is invalid');
    this.name = 'StatusManagementContractError';
  }
}

export class StatusManagementMissingError extends Error {
  constructor(resource: 'component' | 'incident') {
    super(`Status Management ${resource} is missing`);
    this.name = 'StatusManagementMissingError';
  }
}

export function parseStatusOrg(value: unknown): StatusOrgRecord {
  const record = readRecord(value);
  return {
    id: readPositiveInteger(record.id),
    name: readRequiredString(record.name),
    description: readRequiredString(record.description),
    home: readRequiredString(record.home),
    logo: readRequiredString(record.logo),
    ...readOptionalNullableString(record, 'feedback'),
    ...readOptionalNullableString(record, 'color'),
    state: readIntegerInRange(record.state, 0, 2),
    ...readAuditFields(record)
  };
}

export function parseStatusComponents(value: unknown): StatusComponentRecord[] {
  if (!Array.isArray(value)) throw new StatusManagementContractError();
  const components = value.map(parseStatusComponent);
  assertUniqueIds(components);
  return components;
}

export function parseStatusComponentDetail(value: unknown): StatusComponentRecord {
  if (value === null) throw new StatusManagementMissingError('component');
  return parseStatusComponent(value);
}

export function parseStatusIncidentDetail(value: unknown): StatusIncidentRecord {
  if (value === null) throw new StatusManagementMissingError('incident');
  return parseStatusIncident(value);
}

export function parseStatusIncidentPage(
  value: unknown,
  query: StatusIncidentQuery
): StatusIncidentPage {
  const record = readRecord(value);
  if (!Array.isArray(record.content)) throw new StatusManagementContractError();
  const content = record.content.map(parseStatusIncident);
  assertUniqueIds(content);
  const totalElements = readNonnegativeInteger(record.totalElements);
  const totalPages = readNonnegativeInteger(record.totalPages);
  const number = readNonnegativeInteger(record.number);
  const size = readPositiveInteger(record.size);
  if (number !== query.pageIndex || size !== query.pageSize) {
    throw new StatusManagementContractError();
  }
  if (
    content.length > size
    || totalElements < content.length
    || totalPages !== Math.ceil(totalElements / size)
    || (content.length > 0 && number * size >= totalElements)
    || content.length > Math.max(0, totalElements - number * size)
  ) {
    throw new StatusManagementContractError();
  }
  return { content, totalElements, totalPages, number, size };
}

function parseStatusComponent(value: unknown): StatusComponentRecord {
  const record = readRecord(value);
  return {
    id: readPositiveInteger(record.id),
    orgId: readPositiveInteger(record.orgId),
    name: readRequiredString(record.name),
    ...readOptionalNullableString(record, 'description'),
    ...readOptionalLabels(record),
    method: readIntegerInRange(record.method, 0, 1),
    configState: readIntegerInRange(record.configState, 0, 2),
    state: readIntegerInRange(record.state, 0, 2),
    ...readAuditFields(record)
  };
}

function parseStatusIncident(value: unknown): StatusIncidentRecord {
  const record = readRecord(value);
  const id = readPositiveInteger(record.id);
  const orgId = readPositiveInteger(record.orgId);
  const components = readOptionalNestedRecords(record, 'components', parseStatusComponent);
  const contents = readOptionalNestedRecords(record, 'contents', parseStatusIncidentContent);
  if (components) {
    assertUniqueIds(components);
    if (components.some(component => component.orgId !== orgId)) {
      throw new StatusManagementContractError();
    }
  }
  if (contents) {
    assertUniqueIds(contents);
    if (contents.some(content => content.incidentId !== id)) {
      throw new StatusManagementContractError();
    }
  }
  return {
    id,
    orgId,
    name: readRequiredString(record.name),
    state: readIntegerInRange(record.state, 0, 3),
    ...readOptionalPositiveInteger(record, 'startTime'),
    ...readOptionalPositiveInteger(record, 'endTime'),
    ...(components === undefined ? {} : { components }),
    ...(contents === undefined ? {} : { contents }),
    ...readAuditFields(record)
  };
}

function parseStatusIncidentContent(value: unknown): StatusIncidentContentRecord {
  const record = readRecord(value);
  return {
    id: readPositiveInteger(record.id),
    incidentId: readPositiveInteger(record.incidentId),
    message: readRequiredString(record.message),
    state: readIntegerInRange(record.state, 0, 3),
    timestamp: readPositiveInteger(record.timestamp),
    ...readAuditFields(record)
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new StatusManagementContractError();
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new StatusManagementContractError();
  }
  return value as Record<string, unknown>;
}

function readRequiredString(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) throw new StatusManagementContractError();
  return value;
}

function readNonnegativeInteger(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new StatusManagementContractError();
  }
  return value as number;
}

function readPositiveInteger(value: unknown) {
  const integer = readNonnegativeInteger(value);
  if (integer < 1) throw new StatusManagementContractError();
  return integer;
}

function readIntegerInRange(value: unknown, minimum: number, maximum: number) {
  const integer = readNonnegativeInteger(value);
  if (integer < minimum || integer > maximum) throw new StatusManagementContractError();
  return integer;
}

function readOptionalNullableString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value === undefined) return {};
  if (value !== null && typeof value !== 'string') throw new StatusManagementContractError();
  return { [key]: value };
}

function readOptionalPositiveInteger(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value === undefined) return {};
  if (value === null) return { [key]: null };
  return { [key]: readPositiveInteger(value) };
}

function readOptionalLabels(record: Record<string, unknown>) {
  const value = record.labels;
  if (value === undefined) return {};
  if (value === null) return { labels: null };
  const labels = readRecord(value);
  if (Object.values(labels).some(label => typeof label !== 'string')) {
    throw new StatusManagementContractError();
  }
  return { labels: labels as Record<string, string> };
}

function readOptionalNestedRecords<T>(
  record: Record<string, unknown>,
  key: string,
  parser: (value: unknown) => T
): T[] | null | undefined {
  const value = record[key];
  if (value === undefined || value === null) return value;
  if (!Array.isArray(value)) throw new StatusManagementContractError();
  return value.map(parser);
}

function assertUniqueIds(records: readonly { id: number }[]) {
  if (new Set(records.map(record => record.id)).size !== records.length) {
    throw new StatusManagementContractError();
  }
}

function readAuditFields(record: Record<string, unknown>) {
  return {
    ...readOptionalNullableString(record, 'creator'),
    ...readOptionalNullableString(record, 'modifier'),
    ...readOptionalNullableString(record, 'gmtCreate'),
    ...readOptionalNullableString(record, 'gmtUpdate')
  };
}
