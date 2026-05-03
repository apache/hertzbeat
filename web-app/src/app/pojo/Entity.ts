/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export class EntityCatalogLink {
  name?: string;
  type?: string;
  provider?: string;
  url?: string;
}

export class EntityCatalogContact {
  name?: string;
  type?: string;
  value?: string;
  contact?: string;
}

export class EntityHertzBeatCodeLocation {
  repositoryURL?: string;
  paths?: string[];
}

export class EntityHertzBeatSavedQuery {
  name?: string;
  query?: string;
}

export class EntityHertzBeatPerformanceData {
  tags?: string[];
}

export class EntityHertzBeatPipelines {
  fingerprints?: string[];
}

export class EntityHertzBeatConfig {
  codeLocations?: EntityHertzBeatCodeLocation[];
  events?: EntityHertzBeatSavedQuery[];
  logs?: EntityHertzBeatSavedQuery[];
  performanceData?: EntityHertzBeatPerformanceData;
  pipelines?: EntityHertzBeatPipelines;
}

export class EntityOwnerRef {
  name?: string;
  type?: string;
}

export class EntityApiInterface {
  definition?: Record<string, unknown>;
  fileRef?: string;
}

export class Entity {
  id!: number;
  type!: string;
  name!: string;
  displayName?: string;
  subtype?: string;
  namespace?: string;
  environment?: string;
  status: string = 'unknown';
  criticality?: string;
  owner?: string;
  additionalOwners?: EntityOwnerRef[];
  runbook?: string;
  lifecycle?: string;
  tier?: string;
  system?: string;
  componentOf?: string[];
  components?: string[];
  implementedBy?: string[];
  apiInterface?: EntityApiInterface;
  inheritFrom?: string;
  languages?: string[];
  links?: EntityCatalogLink[];
  contacts?: EntityCatalogContact[];
  integrations?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
  hertzbeat?: EntityHertzBeatConfig;
  source: string = 'manual';
  description?: string;
  labels?: Record<string, string>;
  tags?: string[];
  creator?: string;
  modifier?: string;
  gmtCreate?: number | string;
  gmtUpdate?: number | string;
}
