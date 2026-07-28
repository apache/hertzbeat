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

import type { PublicStatusIncidentRange } from './public-status-incident-range';

export type PublicStatusOrg = {
  name: string;
  description: string;
  home: string;
  logo: string;
  feedback?: string;
  state: PublicStatusOrgState;
  color?: string;
};

export type PublicStatusHistory = {
  id?: number;
  componentId: number;
  state: PublicStatusComponentState;
  timestamp: number;
  uptime?: number;
  abnormal?: number;
  unknowing?: number;
  normal?: number;
};

export type PublicStatusComponent = {
  id: number;
  name: string;
  description?: string;
  state: PublicStatusComponentState;
  history: PublicStatusHistory[] | null;
};

export type PublicStatusIncidentComponent = {
  id: number;
  name: string;
  description?: string;
  state: PublicStatusComponentState;
};

export type PublicStatusIncidentContent = {
  id: number;
  incidentId: number;
  message: string;
  state: PublicStatusIncidentState;
  timestamp: number;
};

export type PublicStatusIncident = {
  id: number;
  name: string;
  state: PublicStatusIncidentState;
  startTime?: number;
  endTime?: number;
  components: PublicStatusIncidentComponent[] | null;
  contents: PublicStatusIncidentContent[] | null;
};

export type PublicStatusOrgState = 'healthy' | 'degraded' | 'incident' | 'unknown';
export type PublicStatusComponentState = 'healthy' | 'incident' | 'unknown';
export type PublicStatusIncidentState = 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'unknown';

export type PublicStatusIncidentPage = PagedCollection<PublicStatusIncident>;

export type PublicStatusState = 'ready' | 'unconfigured' | 'unavailable' | 'invalid' | 'permission' | 'error';

export type PublicStatusViewModel = {
  org: PublicStatusOrg | undefined;
  components: PublicStatusComponent[];
  incidents: PublicStatusIncident[];
  incidentLoading: boolean;
  incidentRange: PublicStatusIncidentRange;
  incidentRefreshing: boolean;
  loading: boolean;
  refreshIncidents: () => unknown;
  selectIncidentYear: (year: number) => void;
  state: PublicStatusState;
};

export class PublicStatusContractError extends Error {
  constructor() {
    super('Public status response is invalid');
    this.name = 'PublicStatusContractError';
  }
}
