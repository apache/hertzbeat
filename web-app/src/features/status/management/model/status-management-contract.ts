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

import type { PagedCollection } from '@/shared/pagination';

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

type StatusIncidentContentRecord = StatusIncidentContent & {
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

export type StatusIncidentPage = PagedCollection<StatusIncidentRecord>;

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
