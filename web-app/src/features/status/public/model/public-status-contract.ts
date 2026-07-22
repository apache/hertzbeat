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

export type PublicStatusOrg = {
  name: string;
  description: string;
  home?: string;
  state: PublicStatusOrgState;
  color?: string;
};

export type PublicStatusComponent = {
  id: number;
  name: string;
  description?: string;
  state: PublicStatusComponentState;
};

export type PublicStatusIncident = {
  id: number;
  name: string;
  state: PublicStatusIncidentState;
  startTime?: number;
  endTime?: number;
};

export type PublicStatusOrgState = 'healthy' | 'degraded' | 'incident' | 'unknown';
export type PublicStatusComponentState = 'healthy' | 'incident' | 'unknown';
export type PublicStatusIncidentState = 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'unknown';

export type PublicStatusIncidentPage = PagedCollection<PublicStatusIncident>;

export type PublicStatusState = 'ready' | 'unconfigured' | 'unavailable' | 'error';

export type PublicStatusViewModel = {
  org: PublicStatusOrg | undefined;
  components: PublicStatusComponent[];
  incidents: PublicStatusIncident[];
  loading: boolean;
  state: PublicStatusState;
};
