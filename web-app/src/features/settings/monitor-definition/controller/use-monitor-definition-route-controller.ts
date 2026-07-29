/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  monitorDefinitionWorkspaceApp,
  normalizeMonitorDefinitionRouteApp,
  readMonitorDefinitionAppQuery,
  writeMonitorDefinitionAppQuery,
  type MonitorDefinitionWorkspace
} from '../model/monitor-definition-model';

type WorkspaceOpenAttempt = { admitted: boolean; completion: Promise<void> };
const unobserved = Symbol('unobserved');

type RouteWorkspaceActions = {
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
  useMonitorDefinitionWorkspaceRoute(query.app, workspace, actions, route);
  const writeApp = (app: string | null, replace = false) => {
    const normalized = normalizeMonitorDefinitionRouteApp(app);
    route.write(normalized);
    setParams(writeMonitorDefinitionAppQuery(params, normalized), { replace });
  };
  return monitorDefinitionRouteActions(workspace, query.app, actions, route, writeApp);
}

function useMonitorDefinitionRouteState(queryApp: string | null): RouteState {
  const latestQueryApp = useRef(queryApp);
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
      } else if (app && workspace === null && !pendingRoute.current.active) {
        // Authority loss retires edit state; a still-owned route may only restore its read-only view.
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
  useEffect(() => {
    route.reconcile(queryApp, workspace, actions);
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
    closeWorkspace: () => {
      const ownedApp = monitorDefinitionWorkspaceApp(workspace);
      const closed = actions.closeWorkspace();
      if (closed && queryApp === ownedApp) writeApp(null, true);
    }
  };
}
