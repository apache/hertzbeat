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

import { Entity } from './Entity';
import { EntityNextAction, EntityOpsSummary } from './EntityDetail';
import { EntityStatus } from './EntityStatus';

export class EntitySummary {
  entity!: Entity;
  identityCount: number = 0;
  monitorCount: number = 0;
  relationCount: number = 0;
  activeAlertCount: number = 0;
  status!: EntityStatus;
  opsSummary?: EntityOpsSummary;
  nextAction?: EntityNextAction;
  lastEvidenceAt?: number | string | null;
  definitionManaged: boolean = false;
  definitionActivityStatus?: string;
  definitionActivitySummary?: string;
  definitionActivityFormat?: string;
  definitionActivityTime?: string | number;
}
