/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

type MonitorDefinitionOrigin = 'builtin' | 'custom' | 'override';
type MonitorDefinitionOperation = 'create' | 'update';
export type MonitorDefinitionDeleteDisposition = 'removed' | 'builtin_restored';
export const MONITOR_DEFINITION_APP_MAX_LENGTH = 128;

export type MonitorDefinitionCatalogItem = {
  app: string;
  label: string;
  origin: MonitorDefinitionOrigin;
  editable: boolean;
  deletable: boolean;
  revision: string;
};

export type MonitorDefinitionCatalog = { schemaVersion: 1; items: MonitorDefinitionCatalogItem[] };
export type MonitorDefinitionDetail = MonitorDefinitionCatalogItem & { schemaVersion: 1; definition: string };
export type MonitorDefinitionValidationRequest = {
  operation: MonitorDefinitionOperation;
  expectedApp: string | null;
  definition: string;
};
export type MonitorDefinitionValidation = {
  schemaVersion: 1;
  valid: true;
  app: string;
  origin: MonitorDefinitionOrigin;
};
export type MonitorDefinitionDelete = {
  schemaVersion: 1;
  app: string;
  disposition: MonitorDefinitionDeleteDisposition;
};

export type MonitorDefinitionDraft =
  | { mode: 'create'; expectedApp: null; definition: string }
  | { mode: 'update'; expectedApp: string; definition: string; revision: string };

export type MonitorDefinitionWorkspace =
  | { kind: 'loading'; mode: 'view' | 'edit'; app: string }
  | { kind: 'error'; mode: 'view' | 'edit'; app: string; failure: MonitorDefinitionFailureKind }
  | { kind: 'view'; detail: MonitorDefinitionDetail }
  | {
      kind: 'edit';
      draft: MonitorDefinitionDraft;
      failure: MonitorDefinitionFailureKind | null;
      pending: 'load' | 'validate' | 'save' | 'refresh' | 'proof' | null;
      validation: MonitorDefinitionValidation | null;
      writeRecovery: 'uncertain' | null;
    };

export type MonitorDefinitionFailureKind =
  | 'not-found'
  | 'app-invalid'
  | 'invalid'
  | 'definition-required'
  | 'create-conflict'
  | 'expected-app-required'
  | 'expected-app-unexpected'
  | 'target-mismatch'
  | 'immutable'
  | 'revision-required'
  | 'revision-invalid'
  | 'revision-conflict'
  | 'in-use'
  | 'persistence-failed'
  | 'runtime-update-failed'
  | 'state-uncertain'
  | 'forbidden'
  | 'unavailable'
  | 'contract'
  | 'error';

export function filterMonitorDefinitions(items: MonitorDefinitionCatalogItem[], query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return items;
  return items.filter(item => [item.app, item.label].some(value => value.toLowerCase().includes(search)));
}

export function buildCreateDraft(): MonitorDefinitionDraft {
  return { mode: 'create', expectedApp: null, definition: '' };
}

export function buildUpdateDraft(detail: MonitorDefinitionDetail): MonitorDefinitionDraft {
  return {
    mode: 'update',
    expectedApp: detail.app,
    definition: detail.definition,
    revision: detail.revision
  };
}

export function monitorDefinitionDraftRequiredFailure(
  draft: MonitorDefinitionDraft
): MonitorDefinitionFailureKind | null {
  return draft.definition.trim() ? null : 'definition-required';
}

export function userCanWriteMonitorDefinitions(roles: readonly string[]) {
  return roles.includes('ADMIN');
}

export function readMonitorDefinitionAppQuery(params: URLSearchParams) {
  const rawApp = params.get('app');
  const app = normalizeMonitorDefinitionRouteApp(rawApp);
  const canonical = writeMonitorDefinitionAppQuery(params, app);
  return { app, canonicalSearch: canonical.toString() };
}

export function writeMonitorDefinitionAppQuery(params: URLSearchParams, app: string | null) {
  const next = new URLSearchParams(params);
  const normalized = normalizeMonitorDefinitionRouteApp(app);
  if (normalized) next.set('app', normalized);
  else next.delete('app');
  return next;
}

export function normalizeMonitorDefinitionRouteApp(value: string | null) {
  const app = value?.trim() ?? '';
  if (
    !app ||
    app.length > MONITOR_DEFINITION_APP_MAX_LENGTH ||
    Array.from(app).some(character => /\p{Cc}/u.test(character))
  )
    return null;
  return app;
}

export function monitorDefinitionWorkspaceApp(workspace: MonitorDefinitionWorkspace | null) {
  if (!workspace) return null;
  if (workspace.kind === 'loading' || workspace.kind === 'error') return workspace.app;
  if (workspace.kind === 'view') return workspace.detail.app;
  return workspace.draft.expectedApp;
}

export function monitorDefinitionWorkspaceHasUncertainWrite(workspace: MonitorDefinitionWorkspace | null) {
  return workspace?.kind === 'edit' && workspace.writeRecovery === 'uncertain';
}

export function monitorDefinitionCanRefreshAuthoritativeDraft(workspace: MonitorDefinitionWorkspace) {
  return (
    workspace.kind === 'edit' &&
    workspace.draft.mode === 'update' &&
    workspace.failure === 'revision-conflict' &&
    workspace.writeRecovery === null
  );
}

const failureMessageKeys: Record<MonitorDefinitionFailureKind, string> = {
  'not-found': 'monitorDefinitions.failure.notFound',
  'app-invalid': 'monitorDefinitions.failure.appInvalid',
  invalid: 'monitorDefinitions.failure.invalid',
  'definition-required': 'monitorDefinitions.failure.definitionRequired',
  'create-conflict': 'monitorDefinitions.failure.createConflict',
  'expected-app-required': 'monitorDefinitions.failure.expectedAppRequired',
  'expected-app-unexpected': 'monitorDefinitions.failure.expectedAppUnexpected',
  'target-mismatch': 'monitorDefinitions.failure.targetMismatch',
  immutable: 'monitorDefinitions.failure.immutable',
  'revision-required': 'monitorDefinitions.failure.revisionRequired',
  'revision-invalid': 'monitorDefinitions.failure.revisionInvalid',
  'revision-conflict': 'monitorDefinitions.failure.revisionConflict',
  'in-use': 'monitorDefinitions.failure.inUse',
  'persistence-failed': 'monitorDefinitions.failure.persistenceFailed',
  'runtime-update-failed': 'monitorDefinitions.failure.runtimeUpdateFailed',
  'state-uncertain': 'monitorDefinitions.failure.stateUncertain',
  forbidden: 'monitorDefinitions.failure.forbidden',
  unavailable: 'monitorDefinitions.failure.unavailable',
  contract: 'monitorDefinitions.failure.contract',
  error: 'monitorDefinitions.failure.error'
};

export function monitorDefinitionFailureMessageKey(failure: MonitorDefinitionFailureKind) {
  return failureMessageKeys[failure];
}
