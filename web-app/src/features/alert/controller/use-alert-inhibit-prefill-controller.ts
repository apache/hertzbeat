/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { loadAlertInhibitPrefillAlerts } from '../api/alert-inhibit-api';
import {
  alertInhibitFailureKind,
  buildAlertInhibitPrefillDraft,
  type AlertInhibitManagementContext
} from '../model/alert-inhibit-model';
import type { AlertInhibitPrefillState } from '../model/alert-inhibit-state';
import type { AlertInhibitEditorController } from './use-alert-inhibit-editor-controller';
import type { AlertInhibitOperationController } from './use-alert-inhibit-operation-controller';

type AlertInhibitOperationOwner = NonNullable<ReturnType<AlertInhibitOperationController['begin']>>;

/**
 * Restores the entity-to-inhibition handoff without letting a late alert read
 * overwrite a draft the operator has already started editing.
 */
export function useAlertInhibitPrefillController(
  management: AlertInhibitManagementContext | null,
  editor: AlertInhibitEditorController,
  operation: AlertInhibitOperationController
) {
  const { t } = useTranslation();
  const [state, setState] = useState<AlertInhibitPrefillState>('idle');
  const pendingRef = useRef<Promise<void> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const managementRef = useRef(management);
  useEffect(() => {
    managementRef.current = management;
  }, [management]);
  useEffect(
    () => () => {
      abortRef.current?.abort();
      pendingRef.current = undefined;
    },
    []
  );
  const create = (): void => {
    if (pendingRef.current) return;
    if (!management) {
      setState('idle');
      editor.actions.create();
      return;
    }
    const owner = operation.begin('operating');
    if (!owner) return;
    const abort = new AbortController();
    abortRef.current = abort;
    setState('loading');
    const promise = loadEntityAlertsIntoDraft({
      context: management,
      draftName: t('alertInhibits.entityPrefill.name', { entity: management.entityName }),
      signal: abort.signal,
      owner,
      currentManagement: () => managementRef.current,
      editor,
      operation,
      setState,
      release: () => {
        abortRef.current = undefined;
        pendingRef.current = undefined;
      }
    });
    pendingRef.current = promise;
    void promise;
  };
  return { state, create };
}

async function loadEntityAlertsIntoDraft({
  context,
  draftName,
  signal,
  owner,
  currentManagement,
  editor,
  operation,
  setState,
  release
}: {
  context: AlertInhibitManagementContext;
  draftName: string;
  signal: AbortSignal;
  owner: AlertInhibitOperationOwner;
  currentManagement: () => AlertInhibitManagementContext | null;
  editor: AlertInhibitEditorController;
  operation: AlertInhibitOperationController;
  setState: (state: AlertInhibitPrefillState) => void;
  release: () => void;
}) {
  try {
    const alerts = await loadAlertInhibitPrefillAlerts(context.entityId, signal);
    if (!operation.isCurrent(owner)) return;
    if (!sameEntityContext(currentManagement(), context)) {
      setState('idle');
      return;
    }
    const prefill = buildAlertInhibitPrefillDraft(draftName, alerts);
    editor.controls.openCreateDraft(prefill.draft);
    setState(prefill.kind);
  } catch (error) {
    if (!operation.isCurrent(owner)) return;
    if (!sameEntityContext(currentManagement(), context)) {
      setState('idle');
      return;
    }
    editor.controls.openCreateDraft(buildAlertInhibitPrefillDraft(draftName, []).draft);
    setState(alertInhibitFailureKind(error) === 'unavailable' ? 'unavailable' : 'error');
  } finally {
    if (operation.isCurrent(owner)) {
      release();
      operation.end(owner);
    }
  }
}

function sameEntityContext(current: AlertInhibitManagementContext | null, requested: AlertInhibitManagementContext) {
  return current?.entityId === requested.entityId && current.entityName === requested.entityName;
}
