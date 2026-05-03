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

import { EntityDefinitionFormat } from './EntityDefinition';

export interface EntityDiscoveryGovernancePreset {
  id: string;
  name: string;
  owner?: string;
  system?: string;
  source?: string;
  environment?: string;
  status?: string;
  bulkOwner?: string;
  bulkSystem?: string;
  creator?: string;
  updatedAt?: string | number;
}

export interface EntityDiscoveryGovernanceEntityRef {
  entityId: number;
  entityName?: string;
}

export type EntityDiscoveryGovernanceActivityStatus = 'success' | 'warning' | 'info';
export type EntityDiscoveryGovernanceActivityAction =
  | 'adopt'
  | 'create'
  | 'merge'
  | 'bulk-merge'
  | 'bulk-create'
  | 'bulk-adopt-definition'
  | 'policy-hook';

export interface EntityDiscoveryGovernanceActivity {
  id: string;
  happenedAt?: string | number;
  status: EntityDiscoveryGovernanceActivityStatus;
  action: EntityDiscoveryGovernanceActivityAction;
  summary: string;
  detail?: string;
  entityRefs?: EntityDiscoveryGovernanceEntityRef[];
  workspacePath?: string;
  seedDefinitionDraft?: string;
  seedDefinitionFormat?: EntityDefinitionFormat;
  seedDefinitionSource?: string;
  seedDefinitionCount?: number;
  creator?: string;
}
