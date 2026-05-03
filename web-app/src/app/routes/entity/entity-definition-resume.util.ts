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

import { EntityDefinitionWorkspaceResume } from '../../pojo/EntityDefinitionWorkspaceResume';

export interface DefinitionWorkspaceResumeState extends EntityDefinitionWorkspaceResume {
  savedAt: string;
}

const ENTITY_DEFINITION_RESUME_STORAGE_KEY = 'hzb.entity.definition.resume';

function readResumeMap(): Record<string, DefinitionWorkspaceResumeState> {
  try {
    if (typeof localStorage === 'undefined') {
      return {};
    }
    const raw = localStorage.getItem(ENTITY_DEFINITION_RESUME_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, DefinitionWorkspaceResumeState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeResumeMap(value: Record<string, DefinitionWorkspaceResumeState>): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(ENTITY_DEFINITION_RESUME_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage persistence failures
  }
}

export function persistDefinitionWorkspaceResumeState(
  value: Omit<DefinitionWorkspaceResumeState, 'token' | 'savedAt'>,
  token = `definition-resume-${Date.now()}`
): DefinitionWorkspaceResumeState {
  const next: DefinitionWorkspaceResumeState = {
    ...value,
    token,
    savedAt: new Date().toISOString()
  };
  const map = readResumeMap();
  map[token] = next;
  writeResumeMap(map);
  return next;
}

export function readDefinitionWorkspaceResumeState(token?: string | null): DefinitionWorkspaceResumeState | undefined {
  if (!token) {
    return undefined;
  }
  return readResumeMap()[token];
}

export function deleteDefinitionWorkspaceResumeState(token?: string | null): void {
  if (!token) {
    return;
  }
  const map = readResumeMap();
  if (!(token in map)) {
    return;
  }
  delete map[token];
  writeResumeMap(map);
}
