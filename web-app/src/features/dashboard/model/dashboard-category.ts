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

export type DashboardCategorySummary = {
  apps: Array<{
    category: string | null;
    app: string;
    size: number;
    availableSize: number;
    unManageSize: number;
    unAvailableSize: number;
  }>;
};
export type DashboardCategory = {
  category: string;
  total: number;
  available: number;
  unavailable: number;
  paused: number;
};
export function dashboardCategories(summary: DashboardCategorySummary): DashboardCategory[] {
  const categories = new Map<string, DashboardCategory>();
  for (const app of summary.apps) {
    if (!app.category || app.category === '__system__' || app.size === 0) continue;
    const previous = categories.get(app.category) ?? {
      category: app.category,
      total: 0,
      available: 0,
      unavailable: 0,
      paused: 0
    };
    categories.set(app.category, {
      category: app.category,
      total: previous.total + app.size,
      available: previous.available + app.availableSize,
      unavailable: previous.unavailable + app.unAvailableSize,
      paused: previous.paused + app.unManageSize
    });
  }
  return [...categories.values()];
}
