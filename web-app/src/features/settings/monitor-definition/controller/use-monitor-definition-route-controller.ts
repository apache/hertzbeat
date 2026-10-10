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

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  monitorDefinitionWorkspaceApp,
  monitorDefinitionWorkspaceIsDirty,
  normalizeMonitorDefinitionRouteApp,
  readMonitorDefinitionAppQuery,
  writeMonitorDefinitionAppQuery,
  type MonitorDefinitionWorkspace
} from '../model/monitor-definition-model';

type WorkspaceOpenAttempt = { admitted: boolean; completion: Promise<void> };
const unobserved = Symbol('unobserved');

type RouteWorkspaceActions = {
  cancelEdit: () => boolean;
  closeWorkspace: () => boolean;
  followRoute: (app: string | null) => boolean;
  openCreate: () => boolean;
  openEdit: (app: string) => WorkspaceOpenAttempt;
  openView: (app: string) => WorkspaceOpenAttempt;
};

type RouteState = {
  write: (app: string | null) => void;
  interact: (app: string | null) => void;
  reconcile: (app: string | null, workspace: MonitorDefinitionWorkspace | null, actions: RouteWorkspaceActions) => void;
};

export function useMonitorDefinitionRouteController(
  workspace: MonitorDefinitionWorkspace | null,
  actions: RouteWorkspaceActions
) {
  const [params, setParams] = useSearchParams();
  const sourceSearch = params.toString();
  const query = readMonitorDefinitionAppQuery(params);
  const route = useMonitorDefinitionRouteState(query.app);
  useCanonicalMonitorDefinitionAppQuery(sourceSearch, query.canonicalSearch, setParams);
  useDirtyMonitorDefinitionRouteGuard(query.app, workspace, params, setParams, route);
  useSuccessfulCreateRouteSync(workspace, params, setParams, route);
  useMonitorDefinitionWorkspaceRoute(query.app, workspace, actions, route);
  const writeApp = (app: string | null, replace = false) => {
    const normalized = normalizeMonitorDefinitionRouteApp(app);
    route.write(normalized);
    setParams(writeMonitorDefinitionAppQuery(params, normalized), { replace });
  };
  return monitorDefinitionRouteActions(workspace, query.app, actions, route, writeApp);
}

function useSuccessfulCreateRouteSync(
  workspace: MonitorDefinitionWorkspace | null,
  params: URLSearchParams,
  setParams: ReturnType<typeof useSearchParams>[1],
  route: RouteState
) {
  const createActive = useRef(false);
  useEffect(() => {
    if (workspace?.kind === 'edit' && workspace.draft.mode === 'create') {
      createActive.current = true;
      return;
    }
    if (!createActive.current) return;
    createActive.current = false;
    let createdApp: string | null = null;
    if (workspace?.kind === 'view') createdApp = workspace.detail.app;
    else if (workspace?.kind === 'edit' && workspace.draft.mode === 'update') {
      createdApp = workspace.draft.expectedApp;
    }
    if (!createdApp) return;
    route.interact(createdApp);
    route.write(createdApp);
    setParams(writeMonitorDefinitionAppQuery(params, createdApp), { replace: true });
  }, [params, route, setParams, workspace]);
}

function useDirtyMonitorDefinitionRouteGuard(
  queryApp: string | null,
  workspace: MonitorDefinitionWorkspace | null,
  params: URLSearchParams,
  setParams: ReturnType<typeof useSearchParams>[1],
  route: RouteState
) {
  useEffect(() => {
    const ownedApp = monitorDefinitionWorkspaceApp(workspace);
    if (!monitorDefinitionWorkspaceIsDirty(workspace) || queryApp === ownedApp) return;
    route.write(ownedApp);
    setParams(writeMonitorDefinitionAppQuery(params, ownedApp), { replace: true });
  }, [params, queryApp, route, setParams, workspace]);
}

function useMonitorDefinitionRouteState(queryApp: string | null): RouteState {
  const latestQueryApp = useRef(queryApp);
  const observedWorkspaceApp = useRef<string | null>(null);
  const observedApp = useRef<string | null | typeof unobserved>(unobserved);
  const pendingRoute = useRef({ active: false, app: null as string | null });
  const interactionApp = useRef<string | null | typeof unobserved>(unobserved);
  useLayoutEffect(() => {
    latestQueryApp.current = queryApp;
  }, [queryApp]);
  return {
    write: (app: string | null) => {
      observedApp.current = app;
      pendingRoute.current = { active: false, app };
    },
    interact: (app: string | null) => {
      interactionApp.current = app;
    },
    reconcile: (app: string | null, workspace: MonitorDefinitionWorkspace | null, actions: RouteWorkspaceActions) => {
      if (latestQueryApp.current !== app) return;
      const retiredWorkspace = workspace === null && observedWorkspaceApp.current === app;
      observedWorkspaceApp.current = monitorDefinitionWorkspaceApp(workspace);
      if (interactionApp.current !== unobserved && interactionApp.current !== app) return;
      if (interactionApp.current === app) {
        if (monitorDefinitionWorkspaceApp(workspace) !== app) return;
        interactionApp.current = unobserved;
        observedApp.current = app;
        pendingRoute.current.active = false;
      }
      if (observedApp.current !== app) {
        observedApp.current = app;
        pendingRoute.current = { active: true, app };
      } else if (app && retiredWorkspace) {
        // Permission changes retire the prior workspace; the route is then reloaded
        // using the user's current read or write capability.
        pendingRoute.current = { active: true, app };
      }
      if (!pendingRoute.current.active) return;
      if (actions.followRoute(pendingRoute.current.app)) pendingRoute.current.active = false;
    }
  };
}

function useCanonicalMonitorDefinitionAppQuery(
  sourceSearch: string,
  canonicalSearch: string,
  setParams: ReturnType<typeof useSearchParams>[1]
) {
  useEffect(() => {
    if (sourceSearch !== canonicalSearch) setParams(canonicalSearch, { replace: true });
  }, [canonicalSearch, setParams, sourceSearch]);
}

function useMonitorDefinitionWorkspaceRoute(
  queryApp: string | null,
  workspace: MonitorDefinitionWorkspace | null,
  actions: RouteWorkspaceActions,
  route: RouteState
) {
  const committed = useRef(false);
  useEffect(() => {
    if (committed.current) {
      route.reconcile(queryApp, workspace, actions);
      return;
    }
    let current = true;
    // Only the initial route-owned I/O waits for React 18 StrictMode's
    // setup/cleanup replay. Later authority and navigation changes reconcile
    // synchronously so they cannot be starved by unrelated rerenders.
    queueMicrotask(() => {
      if (!current) return;
      committed.current = true;
      route.reconcile(queryApp, workspace, actions);
    });
    return () => {
      current = false;
    };
  }, [actions, queryApp, route, workspace]);
}

function monitorDefinitionRouteActions(
  workspace: MonitorDefinitionWorkspace | null,
  queryApp: string | null,
  actions: RouteWorkspaceActions,
  route: RouteState,
  writeApp: (app: string | null, replace?: boolean) => void
) {
  return {
    clearDeletedApp: (app: string) => {
      if (queryApp === normalizeMonitorDefinitionRouteApp(app)) writeApp(null, true);
    },
    openCreate: () => {
      if (!actions.openCreate()) return;
      route.interact(null);
      writeApp(null);
    },
    openEdit: (app: string) => {
      const normalized = normalizeMonitorDefinitionRouteApp(app);
      if (!normalized) return Promise.resolve();
      const opening = actions.openEdit(normalized);
      if (!opening.admitted) return opening.completion;
      route.interact(normalized);
      writeApp(normalized);
      return opening.completion;
    },
    openView: (app: string) => {
      const normalized = normalizeMonitorDefinitionRouteApp(app);
      if (!normalized) return Promise.resolve();
      const opening = actions.openView(normalized);
      if (!opening.admitted) return opening.completion;
      route.interact(normalized);
      writeApp(normalized);
      return opening.completion;
    },
    cancelEdit: () => {
      const clearRoute = workspace?.kind === 'edit' && workspace.draft.mode === 'create';
      const cancelled = actions.cancelEdit();
      if (cancelled && clearRoute) writeApp(null, true);
    },
    closeWorkspace: () => {
      const ownedApp = monitorDefinitionWorkspaceApp(workspace);
      const closed = actions.closeWorkspace();
      if (closed && queryApp === ownedApp) writeApp(null, true);
    }
  };
}
