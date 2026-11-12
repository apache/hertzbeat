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

export type DashboardVisit = { serviceName: string; environment: string; end: number };
export type DashboardVisitIdentity = { authenticated?: boolean; workspaceId?: string | null; username?: string | null };

export function dashboardVisitKey(identity: DashboardVisitIdentity | null | undefined) {
  return identity?.authenticated && identity.workspaceId && identity.username
    ? `hertzbeat.dashboard.visit.v1.${JSON.stringify([identity.workspaceId, identity.username])}`
    : undefined;
}
export function readDashboardVisit(raw: string | null, now: number): DashboardVisit {
  try {
    const parsed: unknown = JSON.parse(raw ?? 'null');
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || parsed.version !== 1)
      return { serviceName: '', environment: '', end: now };
    const value = parsed as Record<string, unknown>;
    return {
      serviceName: dashboardScopeValue(value.serviceName, 256),
      environment: dashboardScopeValue(value.environment, 128),
      end:
        typeof value.end === 'number' && Number.isSafeInteger(value.end) && value.end >= 900_000 && value.end <= now
          ? value.end
          : now
    };
  } catch {
    return { serviceName: '', environment: '', end: now };
  }
}
export function dashboardScopeValue(value: unknown, maximum: number) {
  if (typeof value !== 'string' || value.length > maximum || /\p{Cc}/u.test(value)) return '';
  return value.trim();
}
export function writeDashboardVisit(value: DashboardVisit) {
  return JSON.stringify({ version: 1, serviceName: value.serviceName, environment: value.environment, end: value.end });
}
