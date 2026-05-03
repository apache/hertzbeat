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
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  EntityDiscoveryGovernanceActivity,
  EntityDiscoveryGovernanceActivityAction,
  EntityDiscoveryGovernanceActivityStatus,
  EntityDiscoveryGovernanceEntityRef
} from '../../pojo/EntityDiscoveryGovernance';

export type DiscoveryGovernanceActivityStatus = EntityDiscoveryGovernanceActivityStatus;
export type DiscoveryGovernanceActivityAction = EntityDiscoveryGovernanceActivityAction;
export type DiscoveryGovernanceActivityEntityRef = EntityDiscoveryGovernanceEntityRef;
export type DiscoveryGovernanceActivity = EntityDiscoveryGovernanceActivity;

export const ENTITY_DISCOVERY_ACTIVITY_STORAGE_KEY = 'hzb.entity.discovery.activity';

export function readDiscoveryGovernanceActivities(limit = 8): DiscoveryGovernanceActivity[] {
  try {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const raw = localStorage.getItem(ENTITY_DISCOVERY_ACTIVITY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DiscoveryGovernanceActivity[];
    return Array.isArray(parsed) ? parsed.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export function writeDiscoveryGovernanceActivities(activities: DiscoveryGovernanceActivity[], limit = 8): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(ENTITY_DISCOVERY_ACTIVITY_STORAGE_KEY, JSON.stringify(activities.slice(0, limit)));
  } catch {
    // ignore storage persistence failures
  }
}

export function findDiscoveryGovernanceActivity(activityId?: string | null): DiscoveryGovernanceActivity | undefined {
  if (activityId == null || activityId.trim() === '') {
    return undefined;
  }
  return readDiscoveryGovernanceActivities(32).find(activity => activity.id === activityId.trim());
}
