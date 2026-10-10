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

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/core/auth/session-context';
import { parseHertzBeatDashboardDocument, type HertzBeatDashboardDocument } from '@/platform/perses';
import { buildSignalDashboardPath } from '@/shared/navigation/signal-dashboard-paths';
import { useSourceScopedValue } from '@/shared/query-context';
import { readDashboardViewQuery, selectDashboardViewPath } from '../model/signal-dashboard-view-query';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { useSignalDashboardCatalog } from './use-signal-dashboard-catalog';
import { useSignalDashboardEditor } from './use-signal-dashboard-editor';
import { useSignalDashboardTime } from './use-signal-dashboard-time';
import { useSignalDashboardHandoff } from './use-signal-dashboard-handoff';
import { useSignalDashboardActions } from './use-signal-dashboard-actions';
import { useDashboardUnsavedNavigation } from './use-dashboard-unsaved-navigation';

export function useSignalDashboardController(): DashboardViewProps {
  const { t } = useTranslation();
  const { session } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const query = readDashboardViewQuery(params);
  const { scope, canWrite, authenticated } = dashboardAccess(session);
  const source = scope + ':' + (query.key ?? '');
  const catalog = useSignalDashboardCatalog(scope, authenticated, query.key);
  const persisted = catalog.read?.kind === 'document' ? catalog.read.document : undefined;
  const preview = useSourceScopedValue<HertzBeatDashboardDocument | undefined>(source, undefined);
  const localError = useSourceScopedValue<string | undefined>(source, undefined);
  const editor = useSignalDashboardEditor({
    source,
    canWrite,
    saved: record => {
      navigation.saved();
      catalog.saved(record);
      preview.setValue(undefined);
      if (query.key !== record.dashboardKey) void navigate(selectDashboardViewPath(params, record.dashboardKey));
    },
    removed: key => {
      catalog.removed(key);
      if (query.key === key) void navigate(buildSignalDashboardPath());
    }
  });
  const navigation = useDashboardUnsavedNavigation(editor.draft);
  const document = editor.draft?.document ?? persisted;
  const valid = validDocument(document);
  const applied = appliedDocument(editor.draft, preview.value, persisted);
  const time = useSignalDashboardTime(params, applied ?? (valid ? document : undefined));
  const handoff = useSignalDashboardHandoff(scope);
  const context = {
    source,
    query,
    catalog,
    editor,
    preview,
    localError,
    time,
    handoff,
    read: catalog.read,
    document,
    t
  };
  const actions = useSignalDashboardActions(context);
  return {
    actions,
    state: dashboardViewState(context, { scope, canWrite, valid, applied })
  };
}
function dashboardViewState(
  context: Parameters<typeof useSignalDashboardActions>[0],
  view: { scope: string; canWrite: boolean; valid: boolean; applied: HertzBeatDashboardDocument | undefined }
): DashboardViewProps['state'] {
  return {
    runtimeIdentity: view.scope,
    ...dashboardCatalogView(context.catalog, context.query.key),
    document: context.document,
    preview: view.applied,
    editor: context.editor.draft,
    incoming: context.handoff.incoming,
    busy: context.editor.busy,
    canWrite: view.canWrite,
    error: context.editor.error ?? context.localError.value ?? context.handoff.error,
    validationError: !view.valid,
    ...dashboardTimeView(context.time)
  };
}

function validDocument(document: HertzBeatDashboardDocument | undefined) {
  if (!document) return false;
  try {
    parseHertzBeatDashboardDocument(document);
    return true;
  } catch {
    return false;
  }
}

function dashboardAccess(session: ReturnType<typeof useSession>['session']) {
  if (!session) return { scope: 'anonymous', canWrite: false, authenticated: false };
  return {
    scope: JSON.stringify([session.username, session.workspaceId, session.expiresAt]),
    authenticated: session.authenticated,
    canWrite: session.authenticated && session.roles.some(role => role === 'ADMIN' || role === 'USER')
  };
}
function appliedDocument(
  draft: ReturnType<typeof useSignalDashboardEditor>['draft'],
  preview: HertzBeatDashboardDocument | undefined,
  persisted: HertzBeatDashboardDocument | undefined
) {
  return preview ?? (!draft || draft.mode === 'edit' ? persisted : undefined);
}
function catalogState(
  query: ReturnType<typeof useSignalDashboardCatalog>['query']
): DashboardViewProps['state']['listState'] {
  return query.isError ? 'error' : query.isPending ? 'loading' : 'ready';
}

function dashboardCatalogView(catalog: ReturnType<typeof useSignalDashboardCatalog>, key: string | undefined) {
  return { records: catalog.records, active: catalog.active, listState: catalogState(catalog.query), selectedKey: key };
}
function dashboardTimeView(time: ReturnType<typeof useSignalDashboardTime>) {
  return {
    controls: time.controls,
    variables: time.query.variables,
    timeWindow: time.timeWindow,
    timeZone: time.timeZone,
    fixedTime: time.query.hasExact,
    validView: time.validView,
    refreshRevision: time.refreshRevision,
    returnPath: time.returnPath
  };
}
