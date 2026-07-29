/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useRef } from 'react';
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
  interactionApp: { current: string | null | typeof unobserved };
  latestQueryApp: { current: string | null };
  observedApp: { current: string | null | typeof unobserved };
  pendingRoute: { current: { active: boolean; app: string | null } };
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
    route.observedApp.current = normalized;
    route.pendingRoute.current = { active: false, app: normalized };
    setParams(writeMonitorDefinitionAppQuery(params, normalized), { replace });
  };
  return monitorDefinitionRouteActions(workspace, query.app, actions, route, writeApp);
}

function useMonitorDefinitionRouteState(queryApp: string | null): RouteState {
  const latestQueryApp = useRef(queryApp);
  const observedApp = useRef<string | null | typeof unobserved>(unobserved);
  const pendingRoute = useRef({ active: false, app: null as string | null });
  const interactionApp = useRef<string | null | typeof unobserved>(unobserved);
  latestQueryApp.current = queryApp;
  return { latestQueryApp, observedApp, pendingRoute, interactionApp };
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
    if (route.latestQueryApp.current !== queryApp) return;
    if (route.interactionApp.current !== unobserved && route.interactionApp.current !== queryApp) return;
    if (route.interactionApp.current === queryApp) {
      if (monitorDefinitionWorkspaceApp(workspace) !== queryApp) return;
      route.interactionApp.current = unobserved;
      route.observedApp.current = queryApp;
      route.pendingRoute.current.active = false;
    }
    if (route.observedApp.current !== queryApp) {
      route.observedApp.current = queryApp;
      route.pendingRoute.current = { active: true, app: queryApp };
    } else if (queryApp && workspace === null && !route.pendingRoute.current.active) {
      // Authority loss retires edit state; a still-owned route may only restore its read-only view.
      route.pendingRoute.current = { active: true, app: queryApp };
    }
    if (!route.pendingRoute.current.active) return;
    if (actions.followRoute(route.pendingRoute.current.app)) route.pendingRoute.current.active = false;
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
      route.interactionApp.current = null;
      writeApp(null);
    },
    openEdit: (app: string) => {
      const normalized = normalizeMonitorDefinitionRouteApp(app);
      if (!normalized) return Promise.resolve();
      const opening = actions.openEdit(normalized);
      if (!opening.admitted) return opening.completion;
      route.interactionApp.current = normalized;
      writeApp(normalized);
      return opening.completion;
    },
    openView: (app: string) => {
      const normalized = normalizeMonitorDefinitionRouteApp(app);
      if (!normalized) return Promise.resolve();
      const opening = actions.openView(normalized);
      if (!opening.admitted) return opening.completion;
      route.interactionApp.current = normalized;
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
