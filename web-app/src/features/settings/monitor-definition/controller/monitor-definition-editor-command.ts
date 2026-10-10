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

import {
  createMonitorDefinition,
  loadMonitorDefinitionDetail,
  MonitorDefinitionRequestError,
  updateMonitorDefinition,
  validateMonitorDefinition
} from '../api/monitor-definition-api';
import { buildUpdateDraft, type MonitorDefinitionDraft } from '../model/monitor-definition-model';
import type { MonitorDefinitionCatalogProof } from './monitor-definition-catalog-proof';
import type { MonitorDefinitionOperation } from './monitor-definition-operation-owner';

export async function performMonitorDefinitionEditorCommand(
  operation: 'validate' | 'save' | 'refresh',
  draft: MonitorDefinitionDraft,
  language: string,
  catalogProof: MonitorDefinitionCatalogProof,
  command: MonitorDefinitionOperation
) {
  if (operation === 'validate') {
    return validateMonitorDefinition({
      operation: draft.mode,
      expectedApp: draft.expectedApp,
      definition: draft.definition
    });
  }
  if (operation === 'refresh' && draft.mode === 'update') {
    return buildUpdateDraft(await loadMonitorDefinitionDetail(draft.expectedApp, language, command.abort.signal));
  }
  if (operation === 'refresh') return draft;
  let committed = false;
  try {
    const receipt = await writeDraft(draft, language, command);
    committed = true;
    const [detail, catalog] = await Promise.all([
      loadMonitorDefinitionDetail(receipt.app, language, command.abort.signal),
      catalogProof.load(command.abort.signal)
    ]);
    return { kind: 'canonical-write' as const, detail, catalog };
  } catch (error) {
    if (!committed) throw error;
    const kind = error instanceof MonitorDefinitionRequestError ? error.kind : 'error';
    throw new MonitorDefinitionRequestError(kind, 'uncertain');
  }
}

function writeDraft(draft: MonitorDefinitionDraft, language: string, command: MonitorDefinitionOperation) {
  return draft.mode === 'create'
    ? createMonitorDefinition(draft.definition, language, command.abort.signal)
    : updateMonitorDefinition(draft.expectedApp, draft.definition, draft.revision, language, command.abort.signal);
}
