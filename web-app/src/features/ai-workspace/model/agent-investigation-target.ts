/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type AgentEntityInvestigationSource = {
  entityId: number;
  signal: { type: 'investigation'; start: number; end: number; timezone: string };
};

export type AgentEntityInvestigationTarget = AgentEntityInvestigationSource & {
  version: 'entity-investigation.v1';
  service?: { name: string; namespace: string; environment: string };
};

export type AgentIncidentTarget = {
  version: 'incident.v1';
  alertId: number;
  alertType: 'single';
  incident: { analysisPolicyId: number; alertIds: number[]; windowStartedAt: number; end: number };
};
