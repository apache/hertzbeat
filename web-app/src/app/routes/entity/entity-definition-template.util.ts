/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this file for additional information
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

import { DefinitionWorkspaceTemplate } from '../../pojo/EntityDefinitionWorkspaceTemplate';

export type { DefinitionWorkspaceTemplate, DefinitionWorkspaceTemplateSource } from '../../pojo/EntityDefinitionWorkspaceTemplate';

export const ENTITY_DEFINITION_TEMPLATE_STORAGE_KEY = 'hzb.entity.definition.templates';

export function readDefinitionWorkspaceTemplates(limit = 8): DefinitionWorkspaceTemplate[] {
  try {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const raw = localStorage.getItem(ENTITY_DEFINITION_TEMPLATE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DefinitionWorkspaceTemplate[];
    return Array.isArray(parsed)
      ? parsed
          .map(item => ({
            id: item.id,
            name: item.name,
            format: item.format,
            content: item.content,
            summary: item.summary,
            source: item.source,
            kind: item.kind,
            creator: item.creator,
            updatedAt: item.updatedAt
          }))
          .slice(0, limit)
      : [];
  } catch {
    return [];
  }
}

export function writeDefinitionWorkspaceTemplates(templates: DefinitionWorkspaceTemplate[], limit = 8): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(ENTITY_DEFINITION_TEMPLATE_STORAGE_KEY, JSON.stringify(templates.slice(0, limit)));
  } catch {
    // ignore storage persistence failures
  }
}
