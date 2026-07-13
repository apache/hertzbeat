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

export type AppCount = {
  app: string;
  category: string;
  size: number;
  availableSize: number;
  unAvailableSize: number;
  unManageSize: number;
};

export function hasMonitorData(apps: AppCount[] | null): apps is AppCount[] {
  return Array.isArray(apps);
}

export function monitorTotals(apps: AppCount[]) {
  return apps.reduce(
    (total, app) => ({
      total: total.total + app.size,
      available: total.available + app.availableSize,
      unavailable: total.unavailable + app.unAvailableSize,
      unmanaged: total.unmanaged + app.unManageSize
    }),
    { total: 0, available: 0, unavailable: 0, unmanaged: 0 }
  );
}
