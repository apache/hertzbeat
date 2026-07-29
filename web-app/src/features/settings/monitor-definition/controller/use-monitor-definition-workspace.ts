/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { MonitorDefinitionWorkspace } from '../model/monitor-definition-model';
import type { MonitorDefinitionCatalogProof } from './monitor-definition-catalog-proof';
import { createMonitorDefinitionOperationOwner } from './monitor-definition-operation-owner';
import { monitorDefinitionWorkspaceRequiresWrite } from './monitor-definition-workspace-commands';
import { useMonitorDefinitionWorkspaceEditor } from './use-monitor-definition-workspace-editor';
import { useMonitorDefinitionWorkspaceOpen } from './use-monitor-definition-workspace-open';
import { useMonitorDefinitionWorkspaceRoute } from './use-monitor-definition-workspace-route';

export function useMonitorDefinitionWorkspace(options: {
  canWrite: boolean;
  catalogProof: MonitorDefinitionCatalogProof;
  language: string;
  onChanged: () => void;
}) {
  const owner = useMemo(() => createMonitorDefinitionOperationOwner(), []);
  const authority = useMemo(() => createMonitorDefinitionOperationOwner(), []);
  const [storedWorkspace, setStoredWorkspace] = useState<StoredWorkspace>(() => ({
    authorityEpoch: authority.snapshot(),
    value: null
  }));
  const storedValue = authority.matches(storedWorkspace.authorityEpoch) ? storedWorkspace.value : null;
  const requiresWrite = monitorDefinitionWorkspaceRequiresWrite(storedValue);
  const workspace = !options.canWrite && requiresWrite ? null : storedValue;
  const setWorkspace = useCallback(
    (value: MonitorDefinitionWorkspace | null) => {
      setStoredWorkspace({ authorityEpoch: authority.snapshot(), value });
    },
    [authority]
  );
  const canWriteRef = useRef(options.canWrite);
  const workspaceRef = useRef(workspace);
  const actionEpoch = owner.snapshot();
  useLayoutEffect(() => {
    canWriteRef.current = options.canWrite;
    workspaceRef.current = workspace;
  }, [options.canWrite, workspace]);
  useLayoutEffect(() => {
    if (options.canWrite || !requiresWrite) return;
    authority.retire();
    owner.retire();
  }, [authority, options.canWrite, owner, requiresWrite]);
  useEffect(
    () => () => {
      authority.retire();
      owner.retire();
    },
    [authority, owner]
  );
  const context = {
    workspace,
    workspaceRef,
    canWriteRef,
    actionEpoch,
    owner,
    setWorkspace,
    catalogProof: options.catalogProof,
    language: options.language,
    onChanged: options.onChanged
  };
  return {
    workspace,
    actions: {
      ...useMonitorDefinitionWorkspaceOpen(context),
      ...useMonitorDefinitionWorkspaceEditor(context),
      ...useMonitorDefinitionWorkspaceRoute(context)
    }
  };
}

type StoredWorkspace = {
  authorityEpoch: number;
  value: MonitorDefinitionWorkspace | null;
};
