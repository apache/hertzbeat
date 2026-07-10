'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Boxes,
  Braces,
  Cable,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  Globe2,
  Layers3,
  ListTree,
  Monitor,
  Network,
  PencilLine,
  Server,
  type LucideIcon
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/components/providers/i18n-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HzConfirmDialog } from '@hertzbeat/ui';
import { HzCodeEditor } from '../ui/hz-code-editor';
import { WorkbenchInsetPanel } from '@/components/workbench/primitives';
import { apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { addJsonRow, addObjectRow, ensureJsonRows, ensureObjectRows, removeJsonRow, removeObjectArrayItem, updateJsonRow, updateObjectArrayItem } from '@/lib/entity-editor/collection-state';
import { buildEntityPayload, saveEntityPayload } from '@/lib/entity-editor/controller';
import type { KeyValueDraft } from '@/lib/entity-editor/draft-utils';
import { ensureKeyValueRows, removeRowAt, updateRowAt } from '@/lib/entity-editor/editor-state';
import { buildEntityEditorFormState } from '@/lib/entity-editor/initial-state';
import { buildEntityEditorAttributionRows, resolveEntityEditorDiscoveryReturnHref } from '@/lib/entity-editor/view-model';
import type { SignalRouteContext } from '@/lib/signal-route-context';
import type {
  EntityCatalogSuggestions,
  EntityContactRef,
  EntityDto,
  EntityLinkRef,
  EntityMonitorBindingCandidate,
  EntityOwnerRef,
  EntitySummaryInfo,
  Monitor as MonitorDto,
  PageResult
} from '@/lib/types';
import { cn } from '@/lib/utils';

const fieldLabelClassName = 'text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ops-text-tertiary)]';
const shellPanelLayoutClassName = 'grid gap-2.5';
const ENTITY_EDITOR_JSON_OBJECT_ROW_LIMIT = 8;
const ENTITY_EDITOR_MONITOR_BIND_SEARCH_PAGE_SIZE = 5;
const environmentSuggestions = ['prod', 'staging', 'test', 'dev'];
const entitySubtypeSuggestionsByType: Record<string, string[]> = {
  system: ['business-domain', 'product-line', 'platform'],
  service: ['http', 'grpc', 'rpc', 'worker', 'job'],
  host: ['linux', 'windows', 'container-node'],
  database: ['mysql', 'postgresql', 'redis', 'mongodb'],
  queue: ['kafka', 'rabbitmq', 'rocketmq'],
  middleware: ['nginx', 'gateway', 'cache'],
  api: ['http', 'graphql', 'grpc'],
  endpoint: ['url', 'tcp', 'http'],
  device: ['network', 'edge', 'sensor'],
  k8s_workload: ['deployment', 'statefulset', 'daemonset', 'job']
};

type EntityEditorStageKey = 'basic' | 'ownership' | 'signals' | 'relations';

type EntityEditorStageRow = {
  key: EntityEditorStageKey;
  title: string;
  description: string;
  done: boolean;
};

type EntityTypeCard = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type EntitySourceOption = {
  value: 'manual' | 'otel_resource' | 'definition';
  label: string;
  icon: LucideIcon;
};

type EntityEditorFieldOptions = {
  extraClassName?: string;
  ariaLabel?: string;
  help?: string;
  impact?: string;
  suggestions?: string[];
  suggestionCapable?: boolean;
  inputMode?: EntityEditorFieldInputMode;
  requirement?: EntityEditorFieldRequirement;
};

type EntityEditorFieldInputMode = 'manual' | 'suggestions' | 'catalog' | 'selection';

type EntityEditorFieldRequirement = 'required' | 'recommended' | 'optional';

type EntityEditorFieldTitleProps = {
  label: string;
  fieldKey?: string;
  help?: string;
  impact?: string;
  helpId?: string;
  helpLabel?: string;
  inputMode?: EntityEditorFieldInputMode;
  inputModeLabel?: string;
  inputModeHelp?: string;
  requirement?: EntityEditorFieldRequirement;
  requirementLabel?: string;
};

function hasNonEmptyText(value?: string | null) {
  return value != null && value.trim() !== '';
}

function resolveEntityEditorInitialStage(value: string | null | undefined, incomingMonitorNeedsBinding: boolean): EntityEditorStageKey {
  if (value === 'basic' || value === 'ownership' || value === 'signals' || value === 'relations') {
    return value;
  }
  return incomingMonitorNeedsBinding ? 'signals' : 'basic';
}

function resolveEntityEditorReturnHref(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return '/entities';
  }

  try {
    const parsed = new URL(normalized, 'https://hertzbeat.local');
    if (parsed.origin !== 'https://hertzbeat.local') {
      return '/entities';
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/entities';
  }
}

export function resolveVisibleEntityEditorMessage(
  message: string | null,
  messageTone: 'success' | 'error' | null,
  t: (key: string, params?: Record<string, string>) => string
) {
  if (message == null) {
    return null;
  }
  return messageTone === 'error' ? localizeEntityEditorMessage(message, t) : message;
}

export function resolveEntityEditorDuplicateRecoveryHref(
  message: string | null,
  messageTone: 'success' | 'error' | null,
  draftName?: string | null
) {
  if (messageTone !== 'error' || message == null) {
    return null;
  }
  const searchTerm = resolveEntityEditorDuplicateSearchTerm(message, draftName);
  if (searchTerm == null) {
    return null;
  }
  const params = new URLSearchParams({
    search: searchTerm,
    source: 'entity-editor-duplicate-recovery'
  });
  return `/entities?${params.toString()}`;
}

export function resolveEntityEditorMonitorBindConflictRecoveryHref(
  message: string | null,
  messageTone: 'success' | 'error' | null,
  conflicts: Record<string, EntityMonitorBindingCandidate | null>,
  returnHref: string
) {
  if (messageTone !== 'error' || message == null) {
    return null;
  }
  const monitorId = resolveEntityEditorMonitorBindConflictMonitorId(message);
  if (monitorId == null) {
    return null;
  }
  return buildEntityEditorMonitorBindConflictHref(conflicts[monitorId], returnHref);
}

export function shouldShowEntityEditorBackendRetry(message: string | null, messageTone: 'success' | 'error' | null) {
  return messageTone === 'error' && message != null && isEntityEditorBackendUnavailableMessage(message.trim());
}

function resolveEntityEditorMonitorBindConflictMonitorId(message: string) {
  const normalized = message.trim();
  if (!normalized.startsWith('Monitor already bound to another entity: ')) {
    return null;
  }
  return normalized.replace('Monitor already bound to another entity: ', '').replace(/\.$/, '').trim() || null;
}

function buildEntityEditorMonitorBindConflictHref(conflict: EntityMonitorBindingCandidate | null | undefined, returnHref: string) {
  if (conflict?.entityId == null) {
    return null;
  }
  const params = new URLSearchParams({
    source: 'entity-editor-monitor-bind-conflict',
    returnTo: returnHref
  });
  return `/entities/${encodeURIComponent(String(conflict.entityId))}?${params.toString()}`;
}

export function buildEntityEditorUniqueNameLookupUrl(name: string) {
  const params = new URLSearchParams({
    search: name.trim(),
    pageIndex: '0',
    pageSize: '8'
  });
  return `/entities?${params.toString()}`;
}

export function findEntityEditorExactUniqueNameMatch(
  page: PageResult<EntitySummaryInfo> | null | undefined,
  name: string,
  currentEntityId?: string | null
) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return null;
  }
  const normalizedCurrentEntityId = currentEntityId?.trim();
  return (
    page?.content?.find(item => {
      const entity = item.entity;
      const entityName = entity?.name?.trim();
      if (entityName !== normalizedName) {
        return false;
      }
      if (normalizedCurrentEntityId && entity?.id != null && String(entity.id) === normalizedCurrentEntityId) {
        return false;
      }
      return true;
    }) ?? null
  );
}

async function findExistingEntityEditorUniqueName(name: string, currentEntityId?: string | null) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return null;
  }
  const page = await apiMessageGet<PageResult<EntitySummaryInfo>>(buildEntityEditorUniqueNameLookupUrl(normalizedName));
  return findEntityEditorExactUniqueNameMatch(page, normalizedName, currentEntityId);
}

function resolveEntityEditorDuplicateSearchTerm(message: string, draftName?: string | null) {
  const normalized = message.trim();
  if (normalized.startsWith('Entity primary identity already exists: ')) {
    const normalizedDraftName = draftName?.trim();
    if (normalizedDraftName) {
      return normalizedDraftName;
    }
    const identity = normalized.replace('Entity primary identity already exists: ', '').replace(/\.$/, '').trim();
    const identityValue = identity.includes('=') ? identity.split('=').pop()?.trim() : identity;
    return identityValue || null;
  }
  if (normalized.startsWith('Entity already exists: ')) {
    const normalizedDraftName = draftName?.trim();
    if (normalizedDraftName) {
      return normalizedDraftName;
    }
    return normalized.replace('Entity already exists: ', '').replace(/\.$/, '').trim() || null;
  }
  return null;
}

function localizeEntityEditorMessage(message: string, t: (key: string, params?: Record<string, string>) => string) {
  const normalized = message.trim();
  if (normalized === '') {
    return t('common.save-failed');
  }
  if (isLocalizedEntityEditorFeedback(normalized, t)) {
    return normalized;
  }
  if (isEntityEditorBackendUnavailableMessage(normalized)) {
    return t('entities.editor.message.backend-unavailable');
  }
  if (normalized.startsWith('Entity already exists: ')) {
    return t('entities.editor.message.entity-already-exists', {
      reference: normalized.replace('Entity already exists: ', '').replace(/\.$/, '')
    });
  }
  if (normalized.startsWith('Entity primary identity already exists: ')) {
    return t('entities.editor.message.entity-primary-identity-exists', {
      identity: normalized.replace('Entity primary identity already exists: ', '').replace(/\.$/, '')
    });
  }
  if (normalized.startsWith('Monitor already bound to another entity: ')) {
    return t('entities.editor.message.monitor-already-bound', {
      monitorId: normalized.replace('Monitor already bound to another entity: ', '').replace(/\.$/, '')
    });
  }
  return t('entities.editor.message.backend-fallback', { message: normalized });
}

function isLocalizedEntityEditorFeedback(message: string, t: (key: string, params?: Record<string, string>) => string) {
  return [
    'common.save-failed',
    'common.save-success',
    'entities.editor.validation.name',
    'entities.editor.validation.json-object',
    'entities.editor.validation.identity-incomplete',
    'entities.editor.validation.monitor-bind-incomplete',
    'entities.editor.validation.relation-incomplete',
    'entities.editor.validation.identity-duplicate',
    'entities.editor.validation.monitor-bind-duplicate',
    'entities.editor.validation.relation-duplicate',
    'entities.editor.message.create-success',
    'entities.editor.message.entity-already-exists',
    'entities.editor.message.entity-primary-identity-exists',
    'entities.editor.message.monitor-already-bound',
    'entities.editor.message.backend-unavailable'
  ].some(key => message === t(key));
}

function isEntityEditorBackendUnavailableMessage(message: string) {
  return message === 'Backend service unavailable. Please retry after the backend service is restored.'
    || message.startsWith('API request failed: 5');
}

function navigateEntityEditorAfterSave(router: ReturnType<typeof useRouter>, href: string) {
  router.push(href);

  if (typeof window === 'undefined') {
    return;
  }

  const target = new URL(href, window.location.origin);
  const nextHref = `${target.pathname}${target.search}${target.hash}`;

  window.setTimeout(() => {
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentHref !== nextHref) {
      window.location.assign(nextHref);
    }
  }, 0);
}

function resolveEntityEditorSourceParam(source: string | null | undefined, returnHref: string) {
  const directSource = source?.trim();
  if (directSource) {
    return directSource;
  }

  try {
    const returnUrl = new URL(returnHref, 'https://hertzbeat.local');
    return returnUrl.searchParams.get('source')?.trim() || null;
  } catch {
    // The return href is already sanitized before use. If parsing still fails, omit source.
    return null;
  }
}

export function buildEntityEditorPostCreateHref(input: {
  createdEntityId: number | string | null | undefined;
  returnHref: string;
  source?: string | null;
  monitorId?: string | null;
  monitorName?: string | null;
  monitorApp?: string | null;
  monitorInstance?: string | null;
}) {
  const createdEntityId = String(input.createdEntityId ?? '').trim();
  if (!createdEntityId) {
    return input.returnHref;
  }

  const params = new URLSearchParams();
  params.set('returnTo', input.returnHref);
  params.set('created', '1');

  const source = resolveEntityEditorSourceParam(input.source, input.returnHref);
  if (source) {
    params.set('source', source);
  }

  const monitorId = input.monitorId?.trim();
  if (source === 'discovery-candidate' && monitorId) {
    params.set('monitorId', monitorId);
    const monitorName = input.monitorName?.trim();
    const monitorApp = input.monitorApp?.trim();
    const monitorInstance = input.monitorInstance?.trim();
    if (monitorName) params.set('monitorName', monitorName);
    if (monitorApp) params.set('monitorApp', monitorApp);
    if (monitorInstance) params.set('monitorInstance', monitorInstance);
  }

  return `/entities/${encodeURIComponent(createdEntityId)}?${params.toString()}`;
}

export function buildEntityEditorPostEditHref(input: {
  entityId: number | string | null | undefined;
  returnHref: string;
  source?: string | null;
  monitorId?: string | null;
  monitorName?: string | null;
  monitorApp?: string | null;
  monitorInstance?: string | null;
}) {
  const entityId = String(input.entityId ?? '').trim();
  if (!entityId) {
    return input.returnHref;
  }

  const source = resolveEntityEditorSourceParam(input.source, input.returnHref);
  const params = new URLSearchParams({
    returnTo: input.returnHref
  });
  params.set('updated', '1');
  if (source) {
    params.set('source', source);
  }

  const monitorId = input.monitorId?.trim();
  if (source === 'discovery-candidate' && monitorId) {
    params.set('monitorId', monitorId);
    const monitorName = input.monitorName?.trim();
    const monitorApp = input.monitorApp?.trim();
    const monitorInstance = input.monitorInstance?.trim();
    if (monitorName) params.set('monitorName', monitorName);
    if (monitorApp) params.set('monitorApp', monitorApp);
    if (monitorInstance) params.set('monitorInstance', monitorInstance);
  }

  return `/entities/${encodeURIComponent(entityId)}?${params.toString()}`;
}

function buildEntityEditorDirtyKey(input: {
  draft: EntityDto;
  labelRows: KeyValueDraft[];
  tagsText: string;
  links: EntityLinkRef[];
  contacts: EntityContactRef[];
  owners: EntityOwnerRef[];
  componentOfText: string;
  componentsText: string;
  implementedByText: string;
  languagesText: string;
  identitiesItems: string[];
  monitorBindItems: string[];
  relationItems: string[];
}) {
  return JSON.stringify(input);
}

function hasAnyStructuredValue(item: object) {
  return Object.values(item as Record<string, unknown>).some(value => {
    if (typeof value === 'string') {
      return value.trim() !== '';
    }
    return Boolean(value);
  });
}

function attributionStateLabel(state: string, t: (key: string) => string) {
  if (state === 'ready') {
    return t('entities.editor.attribution.state.ready');
  }
  if (state === 'missing') {
    return t('entities.editor.attribution.state.missing');
  }
  return t('entities.editor.attribution.state.review');
}

function attributionStateClassName(state: string) {
  if (state === 'ready') {
    return 'border-[#31405c] bg-[#111724] text-[#d8e4ff]';
  }
  if (state === 'missing') {
    return 'border-[#5b2c32] bg-[#211114] text-[#f0a7af]';
  }
  return 'border-[#514223] bg-[#211a0d] text-[#f1c96b]';
}

function buildEntityDefinitionPreview(payload: EntityDto, format: 'yaml' | 'json') {
  if (format === 'json') {
    return JSON.stringify(payload, null, 2);
  }

  const entity = payload.entity || {};
  const lines = [
    'apiVersion: hertzbeat.apache.org/v1',
    'kind: Entity',
    'metadata:',
    `  name: ${entity.name || ''}`,
    'spec:',
    `  type: ${entity.type || ''}`,
    `  displayName: ${entity.displayName || ''}`,
    `  owner: ${entity.owner || ''}`,
    `  system: ${entity.system || ''}`,
    `  environment: ${entity.environment || ''}`,
    `  source: ${entity.source || ''}`
  ];

  return lines.join('\n');
}

function normalizeSuggestions(values?: string[]) {
  return Array.from(new Set((values || []).map(value => value.trim()).filter(Boolean)));
}

const ENTITY_EDITOR_DATALIST_SUGGESTION_LIMIT = 50;

function mergeSuggestions(...suggestionGroups: Array<string[] | undefined>) {
  return normalizeSuggestions(suggestionGroups.flatMap(group => group || []));
}

function replaceFirstEmptyJsonRow(items: string[], value: string) {
  const rows = ensureJsonRows(items);
  const emptyIndex = rows.findIndex(item => {
    const trimmed = item.trim();
    return trimmed === '' || trimmed === '{}';
  });

  if (emptyIndex === -1) {
    return [...rows, value];
  }

  return rows.map((item, index) => (index === emptyIndex ? value : item));
}

function parseMonitorBindMonitorId(item: string) {
  try {
    const parsed = JSON.parse(item) as { monitorId?: string | number; id?: string | number } | null;
    const monitorId = parsed?.monitorId ?? parsed?.id;
    return monitorId == null ? '' : String(monitorId).trim();
  } catch {
    return '';
  }
}

function monitorBindItemsContainMonitor(items: string[], monitorId: string) {
  const normalizedMonitorId = monitorId.trim();
  if (!normalizedMonitorId) {
    return false;
  }
  return items.some(item => parseMonitorBindMonitorId(item) === normalizedMonitorId);
}

function buildManualMonitorBindTemplate(monitorId: string | number) {
  const normalizedMonitorId = String(monitorId).trim();
  return JSON.stringify(
    {
      monitorId: /^\d+$/.test(normalizedMonitorId)
        ? Number(normalizedMonitorId)
        : normalizedMonitorId,
      bindType: 'manual',
      bindSource: 'manual',
      status: 'active',
      score: 100
    },
    null,
    2
  );
}

function hasMonitorBindDraft(items: string[]) {
  return items.some(item => parseMonitorBindMonitorId(item) !== '');
}

function hasJsonObjectDraft(items: string[]) {
  return items.some(item => {
    const trimmed = item.trim();
    return trimmed !== '' && trimmed !== '{}';
  });
}

export function removeJsonObjectListRow(rows: string[], index: number, allowEmpty: boolean) {
  if (allowEmpty && rows.length === 1) {
    return [];
  }
  return removeJsonRow(rows, index);
}

function readIncomingMonitorContext(routeContext?: SignalRouteContext) {
  const monitorId = routeContext?.monitorId?.trim() || '';
  if (!monitorId) {
    return null;
  }
  const monitorName = routeContext?.monitorName?.trim() || '';
  const monitorApp = routeContext?.monitorApp?.trim() || '';
  const monitorInstance = routeContext?.monitorInstance?.trim() || '';
  return {
    monitorId,
    monitorName,
    monitorApp,
    monitorInstance,
    label: monitorName || monitorId,
    meta: [monitorApp, monitorInstance].filter(Boolean).join(' · ') || monitorId
  };
}

function findMonitorBindConflictCandidate(
  candidates: EntityMonitorBindingCandidate[],
  currentEntityId: string | null
) {
  return candidates.find(candidate => {
    if (!candidate?.alreadyBound || candidate.entityId == null) {
      return false;
    }
    return currentEntityId == null || String(candidate.entityId) !== currentEntityId;
  }) ?? null;
}

function EntityEditorFieldHelp({
  id,
  fieldKey,
  label,
  help,
  impact,
  inputModeHelp
}: {
  id: string;
  fieldKey?: string;
  label: string;
  help: string;
  impact?: string;
  inputModeHelp?: string;
}) {
  return (
    <span
      data-entity-editor-field-help-placement="inline-label"
      data-entity-editor-field-help-key={fieldKey}
      className="group relative inline-flex"
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        data-entity-editor-field-help-trigger="hertzbeat-ui-field-help"
        data-entity-editor-field-help-button="icon-after-label"
        data-entity-editor-field-help-visual="circle-help-icon"
        className="inline-flex h-4 w-4 items-center justify-center rounded-none bg-transparent text-[#d8e4ff] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
      >
        <CircleHelp size={12} strokeWidth={2} aria-hidden="true" data-entity-editor-field-help-icon="lucide-circle-help" />
      </button>
      <span
        id={id}
        role="tooltip"
        data-entity-editor-field-help="hertzbeat-ui-field-tooltip"
        className="pointer-events-none absolute left-0 top-6 z-20 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
      >
        <span className="block text-[11px] leading-4 text-[#dbe4f0]">{help}</span>
        {inputModeHelp ? <span className="mt-2 block text-[11px] leading-4 text-[#a8b0bf]">{inputModeHelp}</span> : null}
        {impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{impact}</span> : null}
      </span>
    </span>
  );
}

function EntityEditorFieldInputMode({
  mode,
  label
}: {
  mode: EntityEditorFieldInputMode;
  label: string;
}) {
  return (
    <span
      data-entity-editor-field-input-mode={mode}
      className={cn(
        'rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold',
        mode === 'suggestions' || mode === 'catalog' || mode === 'selection'
          ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff]'
          : 'border-[#2b3039] bg-[#101217] text-[#98a2b3]'
      )}
    >
      {label}
    </span>
  );
}

function EntityEditorFieldRequirement({
  tone,
  label
}: {
  tone: EntityEditorFieldRequirement;
  label: string;
}) {
  return (
    <span
      data-entity-editor-field-requirement={tone}
      className={cn(
        'rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold',
        tone === 'required'
          ? 'bg-[#3b1d1d] text-[#ffb4b4]'
          : tone === 'recommended'
            ? 'bg-[#17213a] text-[#d8e4ff]'
            : 'bg-[#101217] text-[#98a2b3]'
      )}
    >
      {label}
    </span>
  );
}

function EntityEditorFieldTitle({
  label,
  fieldKey,
  help,
  impact,
  helpId,
  helpLabel,
  inputMode,
  inputModeLabel,
  inputModeHelp,
  requirement,
  requirementLabel
}: EntityEditorFieldTitleProps) {
  return (
    <div
      data-entity-editor-field-title="inline-help-and-meta"
      data-entity-editor-field-help-position="after-label-before-meta"
      className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
    >
      <span data-entity-editor-field-label-help="true" className="inline-flex min-w-0 items-center gap-1.5">
        <span className={fieldLabelClassName}>{label}</span>
        {help ? (
          <EntityEditorFieldHelp
            id={helpId || `entity-editor-field-help-${fieldKey || label.replace(/\s+/g, '-').toLowerCase()}`}
            fieldKey={fieldKey}
            label={helpLabel || label}
            help={help}
            impact={impact}
            inputModeHelp={inputModeHelp}
          />
        ) : null}
      </span>
      <span data-entity-editor-field-meta="requirement-and-input-mode" className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
        {requirement && requirementLabel ? <EntityEditorFieldRequirement tone={requirement} label={requirementLabel} /> : null}
        {inputMode && inputModeLabel ? <EntityEditorFieldInputMode mode={inputMode} label={inputModeLabel} /> : null}
      </span>
    </div>
  );
}

function EntityEditorActionHelp({
  copy,
  id,
  label
}: {
  copy: string;
  id: string;
  label: string;
}) {
  const tooltipId = `entity-editor-action-help-${id}`;
  const helpStyle = 'icon-after-action';
  const helpVisual = 'circle-help-icon';

  return (
    <span
      data-entity-editor-action-help={id}
      data-entity-editor-action-help-style={helpStyle}
      className="group/help relative inline-flex"
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        data-entity-editor-action-help-trigger="hertzbeat-ui-action-help"
        data-entity-editor-action-help-trigger-style={helpStyle}
        data-entity-editor-action-help-visual={helpVisual}
        className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#8d95a5] transition hover:text-[#d8e4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
      >
        <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-entity-editor-action-help-icon="lucide-circle-help" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        data-entity-editor-action-help-tooltip={id}
        className="pointer-events-none absolute right-0 top-7 z-20 hidden w-64 rounded-[3px] border border-[#303743] bg-[#111827] px-3 py-2 text-left text-[11px] font-normal leading-5 text-[#d8e4ff] shadow-[0_18px_45px_rgba(0,0,0,0.35)] group-hover/help:block group-focus-within/help:block"
      >
        {copy}
      </span>
    </span>
  );
}

function EntityEditorActionWithHelp({
  children,
  helpCopy,
  helpId,
  helpLabel
}: {
  children: React.ReactNode;
  helpCopy: string;
  helpId: string;
  helpLabel: string;
}) {
  return (
    <span data-entity-editor-action-help-item={helpId} className="inline-flex items-center gap-1">
      {children}
      <EntityEditorActionHelp id={helpId} label={helpLabel} copy={helpCopy} />
    </span>
  );
}

function readIdentityValue(identities: unknown[], identityKey: string) {
  for (const identity of identities) {
    if (typeof identity !== 'object' || identity == null) {
      continue;
    }
    const record = identity as Record<string, unknown>;
    const key = typeof record.identityKey === 'string' ? record.identityKey : typeof record.key === 'string' ? record.key : null;
    const value = typeof record.identityValue === 'string' ? record.identityValue : typeof record.value === 'string' ? record.value : null;
    if (key === identityKey && value != null && value.trim() !== '') {
      return value.trim();
    }
  }
  return undefined;
}

function buildOtlpCandidateDiscoveryHref(payload: EntityDto) {
  const labels = payload.entity.labels || {};
  if (labels['hertzbeat.discovery.source'] !== 'otlp-candidate') {
    return null;
  }

  const identities = Array.isArray(payload.identities) ? payload.identities : [];
  const identityKey =
    identities
      .map(identity => (typeof identity === 'object' && identity != null ? (identity as Record<string, unknown>).identityKey : null))
      .find(key => key === 'service.name' || key === 'host.name' || key === 'k8s.workload.name' || key === 'endpoint.url') ||
    (typeof (identities[0] as Record<string, unknown> | undefined)?.identityKey === 'string'
      ? (identities[0] as Record<string, unknown>).identityKey
      : null);
  const identityValue = typeof identityKey === 'string' ? readIdentityValue(identities, identityKey) : undefined;

  if (typeof identityKey !== 'string' || identityValue == null) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('identityKey', identityKey);
  params.set('identityValue', identityValue);

  if (hasNonEmptyText(payload.entity.name)) {
    params.set('serviceName', payload.entity.name!.trim());
  }
  const namespace = payload.entity.namespace || readIdentityValue(identities, 'service.namespace');
  if (hasNonEmptyText(namespace)) {
    params.set('serviceNamespace', namespace!.trim());
  }
  const environment = payload.entity.environment || readIdentityValue(identities, 'deployment.environment.name');
  if (hasNonEmptyText(environment)) {
    params.set('environment', environment!.trim());
  }

  return `/entities/discovery?${params.toString()}`;
}

function MultiValueField({
  label,
  value,
  placeholder,
  onChange,
  help,
  impact,
  inputModeLabel,
  inputModeHelp,
  helpLabel,
  requirement,
  requirementLabel
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  help?: string;
  impact?: string;
  inputModeLabel?: string;
  inputModeHelp?: string;
  helpLabel?: string;
  requirement?: EntityEditorFieldRequirement;
  requirementLabel?: string;
}) {
  return (
    <label className="grid gap-2">
      <EntityEditorFieldTitle
        label={label}
        fieldKey={label}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode="manual"
        inputModeLabel={inputModeLabel}
        inputModeHelp={inputModeHelp}
        requirement={requirement}
        requirementLabel={requirementLabel}
      />
      <Input aria-label={label} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function KeyValueEditor({
  label,
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  deleteLabel,
  addLabel,
  help,
  impact,
  inputModeLabel,
  inputModeHelp,
  helpLabel,
  requirement,
  requirementLabel
}: {
  label: string;
  rows: KeyValueDraft[];
  onChange: (rows: KeyValueDraft[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  deleteLabel: string;
  addLabel: string;
  help?: string;
  impact?: string;
  inputModeLabel?: string;
  inputModeHelp?: string;
  helpLabel?: string;
  requirement?: EntityEditorFieldRequirement;
  requirementLabel?: string;
}) {
  const nextRows = ensureKeyValueRows(rows);
  return (
    <div className="grid gap-3">
      <EntityEditorFieldTitle
        label={label}
        fieldKey={label}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode="manual"
        inputModeLabel={inputModeLabel}
        inputModeHelp={inputModeHelp}
        requirement={requirement}
        requirementLabel={requirementLabel}
      />
      {nextRows.map((row, index) => (
        <div key={`${label}-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={e => onChange(updateRowAt(nextRows, index, { key: e.target.value }))}
          />
          <Input
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={e => onChange(updateRowAt(nextRows, index, { value: e.target.value }))}
          />
          <Button
            type="button"
            variant="subtle"
            onClick={() => onChange(removeRowAt(nextRows, index))}
          >
            {deleteLabel}
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="subtle" onClick={() => onChange([...nextRows, { key: '', value: '' }])}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function OwnerEditor({
  value,
  onChange,
  title,
  addLabel,
  deleteLabel,
  namePlaceholder,
  typePlaceholder,
  help,
  impact,
  inputModeLabel,
  inputModeHelp,
  helpLabel,
  requirement,
  requirementLabel
}: {
  value: EntityOwnerRef[];
  onChange: (value: EntityOwnerRef[]) => void;
  title: string;
  addLabel: string;
  deleteLabel: string;
  namePlaceholder: string;
  typePlaceholder: string;
  help?: string;
  impact?: string;
  inputModeLabel?: string;
  inputModeHelp?: string;
  helpLabel?: string;
  requirement?: EntityEditorFieldRequirement;
  requirementLabel?: string;
}) {
  const rows = ensureObjectRows(value);
  return (
    <div className="grid gap-3">
      <EntityEditorFieldTitle
        label={title}
        fieldKey={title}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode="manual"
        inputModeLabel={inputModeLabel}
        inputModeHelp={inputModeHelp}
        requirement={requirement}
        requirementLabel={requirementLabel}
      />
      {rows.map((owner, index) => (
        <div key={`owner-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <Input
            placeholder={namePlaceholder}
            value={owner.name || ''}
            onChange={e => onChange(updateObjectArrayItem(rows, index, { name: e.target.value }))}
          />
          <Input
            placeholder={typePlaceholder}
            value={owner.type || ''}
            onChange={e => onChange(updateObjectArrayItem(rows, index, { type: e.target.value }))}
          />
          <Button
            type="button"
            variant="subtle"
            onClick={() => onChange(removeObjectArrayItem(rows, index))}
          >
            {deleteLabel}
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="subtle" onClick={() => onChange(addObjectRow(rows))}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function LinkEditor({
  value,
  onChange,
  title,
  addLabel,
  deleteLabel,
  namePlaceholder,
  typePlaceholder,
  providerPlaceholder,
  urlPlaceholder,
  help,
  impact,
  inputModeLabel,
  inputModeHelp,
  helpLabel,
  requirement,
  requirementLabel
}: {
  value: EntityLinkRef[];
  onChange: (value: EntityLinkRef[]) => void;
  title: string;
  addLabel: string;
  deleteLabel: string;
  namePlaceholder: string;
  typePlaceholder: string;
  providerPlaceholder: string;
  urlPlaceholder: string;
  help?: string;
  impact?: string;
  inputModeLabel?: string;
  inputModeHelp?: string;
  helpLabel?: string;
  requirement?: EntityEditorFieldRequirement;
  requirementLabel?: string;
}) {
  const rows = ensureObjectRows(value);
  return (
    <div className="grid gap-3">
      <EntityEditorFieldTitle
        label={title}
        fieldKey={title}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode="manual"
        inputModeLabel={inputModeLabel}
        inputModeHelp={inputModeHelp}
        requirement={requirement}
        requirementLabel={requirementLabel}
      />
      {rows.map((link, index) => (
        <WorkbenchInsetPanel key={`link-${index}`} className={shellPanelLayoutClassName}>
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
            <Input
              placeholder={namePlaceholder}
              value={link.name || ''}
              onChange={e => onChange(updateObjectArrayItem(rows, index, { name: e.target.value }))}
            />
            <Input
              placeholder={typePlaceholder}
              value={link.type || ''}
              onChange={e => onChange(updateObjectArrayItem(rows, index, { type: e.target.value }))}
            />
            <Input
              placeholder={providerPlaceholder}
              value={link.provider || ''}
              onChange={e => onChange(updateObjectArrayItem(rows, index, { provider: e.target.value }))}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              placeholder={urlPlaceholder}
              value={link.url || ''}
              onChange={e => onChange(updateObjectArrayItem(rows, index, { url: e.target.value }))}
            />
            <Button type="button" variant="subtle" onClick={() => onChange(removeObjectArrayItem(rows, index))}>
              {deleteLabel}
            </Button>
          </div>
        </WorkbenchInsetPanel>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="subtle" onClick={() => onChange(addObjectRow(rows))}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function ContactEditor({
  value,
  onChange,
  title,
  addLabel,
  deleteLabel,
  namePlaceholder,
  typePlaceholder,
  valuePlaceholder,
  contactPlaceholder,
  help,
  impact,
  inputModeLabel,
  inputModeHelp,
  helpLabel,
  requirement,
  requirementLabel
}: {
  value: EntityContactRef[];
  onChange: (value: EntityContactRef[]) => void;
  title: string;
  addLabel: string;
  deleteLabel: string;
  namePlaceholder: string;
  typePlaceholder: string;
  valuePlaceholder: string;
  contactPlaceholder: string;
  help?: string;
  impact?: string;
  inputModeLabel?: string;
  inputModeHelp?: string;
  helpLabel?: string;
  requirement?: EntityEditorFieldRequirement;
  requirementLabel?: string;
}) {
  const rows = ensureObjectRows(value);
  return (
    <div className="grid gap-3">
      <EntityEditorFieldTitle
        label={title}
        fieldKey={title}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode="manual"
        inputModeLabel={inputModeLabel}
        inputModeHelp={inputModeHelp}
        requirement={requirement}
        requirementLabel={requirementLabel}
      />
      {rows.map((contact, index) => (
        <WorkbenchInsetPanel key={`contact-${index}`} className={shellPanelLayoutClassName}>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
            <Input
              placeholder={namePlaceholder}
              value={contact.name || ''}
              onChange={e => onChange(updateObjectArrayItem(rows, index, { name: e.target.value }))}
            />
            <Input
              placeholder={typePlaceholder}
              value={contact.type || ''}
              onChange={e => onChange(updateObjectArrayItem(rows, index, { type: e.target.value }))}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              placeholder={valuePlaceholder}
              value={contact.value || ''}
              onChange={e => onChange(updateObjectArrayItem(rows, index, { value: e.target.value }))}
            />
            <Input
              placeholder={contactPlaceholder}
              value={contact.contact || ''}
              onChange={e => onChange(updateObjectArrayItem(rows, index, { contact: e.target.value }))}
            />
            <Button type="button" variant="subtle" onClick={() => onChange(removeObjectArrayItem(rows, index))}>
              {deleteLabel}
            </Button>
          </div>
        </WorkbenchInsetPanel>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="subtle" onClick={() => onChange(addObjectRow(rows))}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function JsonObjectListEditor({
  label,
  value,
  addCopy,
  emptyCopy,
  onChange,
  itemLabel,
  deleteLabel,
  help,
  impact,
  inputModeLabel,
  inputModeHelp,
  helpLabel,
  requirement,
  requirementLabel,
  overflowCopy,
  showAllCopy
}: {
  label: string;
  value: string[];
  addCopy: string;
  emptyCopy?: string;
  onChange: (value: string[]) => void;
  itemLabel: string;
  deleteLabel: string;
  help?: string;
  impact?: string;
  inputModeLabel?: string;
  inputModeHelp?: string;
  helpLabel?: string;
  requirement?: EntityEditorFieldRequirement;
  requirementLabel?: string;
  overflowCopy: (hidden: number, total: number, rendered: number) => string;
  showAllCopy: string;
}) {
  const allowEmpty = Boolean(emptyCopy);
  const [showAllRows, setShowAllRows] = useState(false);
  const rows = allowEmpty && value.length === 0 ? [] : ensureJsonRows(value);
  const visibleRows = showAllRows ? rows : rows.slice(0, ENTITY_EDITOR_JSON_OBJECT_ROW_LIMIT);
  const hiddenRowCount = Math.max(0, rows.length - visibleRows.length);
  return (
    <div
      className="grid gap-3"
      data-entity-editor-json-object-list={label}
      data-entity-editor-json-object-list-total={rows.length}
      data-entity-editor-json-object-list-rendered={visibleRows.length}
      data-entity-editor-json-object-list-limit={ENTITY_EDITOR_JSON_OBJECT_ROW_LIMIT}
      data-entity-editor-json-object-list-overflow={hiddenRowCount > 0 ? 'bounded' : 'none'}
    >
      <EntityEditorFieldTitle
        label={label}
        fieldKey={label}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode="manual"
        inputModeLabel={inputModeLabel}
        inputModeHelp={inputModeHelp}
        requirement={requirement}
        requirementLabel={requirementLabel}
      />
      {rows.length === 0 ? (
        <WorkbenchInsetPanel className="border-dashed border-[#2b3039]/80 bg-[#0b0c0e]/80 px-3 py-3 text-[12px] leading-5 text-[#98a2b3]">
          {emptyCopy}
        </WorkbenchInsetPanel>
      ) : null}
      {visibleRows.map((item, index) => (
        <WorkbenchInsetPanel key={`${label}-${index}`} className={shellPanelLayoutClassName}>
          <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
            <div className="text-sm leading-6 text-[var(--ops-text-secondary)]">
              {itemLabel} {index + 1}
            </div>
            <Button type="button" variant="subtle" onClick={() => onChange(removeJsonObjectListRow(rows, index, allowEmpty))}>
              {deleteLabel}
            </Button>
          </div>
          <HzCodeEditor
            data-entity-editor-json-code-editor="object-row"
            value={item}
            language="json"
            minHeight="132px"
            ariaLabel={`${label} ${index + 1}`}
            onChange={nextValue => onChange(updateJsonRow(rows, index, nextValue))}
          />
        </WorkbenchInsetPanel>
      ))}
      {hiddenRowCount > 0 ? (
        <WorkbenchInsetPanel
          data-entity-editor-json-object-list-overflow-panel="bounded-json-list"
          className="grid gap-2 border-dashed border-[#2b3039]/80 bg-[#0b0c0e]/80 px-3 py-3 text-[12px] leading-5 text-[#98a2b3]"
        >
          <span>
            {overflowCopy(hiddenRowCount, rows.length, visibleRows.length)}
          </span>
          <Button type="button" variant="subtle" onClick={() => setShowAllRows(true)}>
            {showAllCopy}
          </Button>
        </WorkbenchInsetPanel>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="subtle"
          onClick={() => {
            setShowAllRows(true);
            onChange(addJsonRow(rows));
          }}
        >
          {addCopy}
        </Button>
      </div>
    </div>
  );
}

export function EntityEditorSurface({
  initial,
  mode,
  entityId,
  catalogSuggestions,
  routeContext
}: {
  initial: EntityDto;
  mode: 'new' | 'edit';
  entityId?: string;
  catalogSuggestions?: EntityCatalogSuggestions;
  routeContext?: SignalRouteContext;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entityReturnHref = resolveEntityEditorReturnHref(searchParams.get('returnTo'));
  const discoveryReturnHref = useMemo(() => resolveEntityEditorDiscoveryReturnHref(entityReturnHref), [entityReturnHref]);

  const initialFormState = useMemo(() => buildEntityEditorFormState(initial), [initial]);
  const incomingMonitorContext = useMemo(() => readIncomingMonitorContext(routeContext), [routeContext]);
  const incomingMonitorHasInitialBind = Boolean(
    incomingMonitorContext?.monitorId
    && monitorBindItemsContainMonitor(initialFormState.monitorBindItems, incomingMonitorContext.monitorId)
  );
  const incomingMonitorNeedsBinding = Boolean(
    incomingMonitorContext?.monitorId
    && (
      (mode === 'edit' && !incomingMonitorHasInitialBind)
      || (mode === 'new' && incomingMonitorHasInitialBind)
    )
  );
  const initialMonitorBindTemplateId = incomingMonitorNeedsBinding ? incomingMonitorContext?.monitorId || '' : '';
  const initialMonitorBindSearch = incomingMonitorNeedsBinding
    ? incomingMonitorContext?.monitorName || incomingMonitorContext?.monitorInstance || incomingMonitorContext?.monitorApp || ''
    : '';
  const [draft, setDraft] = useState<EntityDto>(initial);
  const [labelRows, setLabelRows] = useState<KeyValueDraft[]>(initialFormState.labelRows);
  const [tagsText, setTagsText] = useState(initialFormState.tagsText);
  const [links, setLinks] = useState<EntityLinkRef[]>(initial.entity.links || []);
  const [contacts, setContacts] = useState<EntityContactRef[]>(initial.entity.contacts || []);
  const [owners, setOwners] = useState<EntityOwnerRef[]>(initial.entity.additionalOwners || []);
  const [componentOfText, setComponentOfText] = useState(initialFormState.componentOfText);
  const [componentsText, setComponentsText] = useState(initialFormState.componentsText);
  const [implementedByText, setImplementedByText] = useState(initialFormState.implementedByText);
  const [languagesText, setLanguagesText] = useState(initialFormState.languagesText);
  const [identitiesItems, setIdentitiesItems] = useState<string[]>(initialFormState.identitiesItems);
  const [monitorBindItems, setMonitorBindItems] = useState<string[]>(initialFormState.monitorBindItems);
  const [relationItems, setRelationItems] = useState<string[]>(initialFormState.relationItems);
  const [monitorBindTemplateId, setMonitorBindTemplateId] = useState(initialMonitorBindTemplateId);
  const [monitorBindSearch, setMonitorBindSearch] = useState(initialMonitorBindSearch);
  const [monitorBindCandidates, setMonitorBindCandidates] = useState<MonitorDto[]>([]);
  const [monitorBindCandidateConflicts, setMonitorBindCandidateConflicts] = useState<Record<string, EntityMonitorBindingCandidate | null>>({});
  const [incomingMonitorPreflightState, setIncomingMonitorPreflightState] = useState<'idle' | 'loading' | 'checked' | 'failed'>('idle');
  const [monitorBindSearchTotal, setMonitorBindSearchTotal] = useState(0);
  const [monitorBindSearchPageIndex, setMonitorBindSearchPageIndex] = useState(0);
  const [monitorBindSearchResolvedQuery, setMonitorBindSearchResolvedQuery] = useState('');
  const [monitorBindSearchMessage, setMonitorBindSearchMessage] = useState<string | null>(null);
  const [monitorBindSearchLoading, setMonitorBindSearchLoading] = useState(false);
  const [monitorBindSearchLoadingMore, setMonitorBindSearchLoadingMore] = useState(false);
  const [relationTargetRef, setRelationTargetRef] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [editorSurfaceMode, setEditorSurfaceMode] = useState<'editor' | 'yaml' | 'json'>('editor');
  const [previewRailCollapsed, setPreviewRailCollapsed] = useState(false);
  const [activeStage, setActiveStage] = useState<EntityEditorStageKey>(
    resolveEntityEditorInitialStage(searchParams.get('stage'), incomingMonitorNeedsBinding)
  );
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const stageBodyRef = useRef<HTMLElement>(null);
  const routeStageFocusDoneRef = useRef(false);
  const currentEntityId = draft.entity.id == null ? null : String(draft.entity.id);
  const routeStageParam = searchParams.get('stage');
  const routeStageFocusStage: EntityEditorStageKey | null =
    routeStageParam === 'basic' || routeStageParam === 'ownership' || routeStageParam === 'signals' || routeStageParam === 'relations'
      ? routeStageParam
      : null;

  useEffect(() => {
    if (routeStageFocusDoneRef.current || routeStageFocusStage == null || routeStageFocusStage !== activeStage) {
      return;
    }

    routeStageFocusDoneRef.current = true;
    stageBodyRef.current?.scrollIntoView({ block: 'start' });
  }, [activeStage, routeStageFocusStage]);

  function updateEntityField<K extends keyof EntityDto['entity']>(key: K, value: EntityDto['entity'][K]) {
    setDraft(prev => ({ ...prev, entity: { ...prev.entity, [key]: value } }));
  }

  const previewPayload = useMemo(() => {
    try {
      return buildEntityPayload(
        {
          draft,
          labelRows,
          tagsText,
          links,
          contacts,
          owners,
          componentOfText,
          componentsText,
          implementedByText,
          languagesText,
          identitiesItems,
          monitorBindItems,
          relationItems
        },
        (label, index) =>
          t('entities.editor.json.invalid', {
            label,
            index
          })
      );
    } catch {
      return draft;
    }
  }, [
    componentOfText,
    componentsText,
    contacts,
    draft,
    identitiesItems,
    implementedByText,
    labelRows,
    languagesText,
    links,
    monitorBindItems,
    owners,
    relationItems,
    tagsText,
    t
  ]);

  const definitionPreview = useMemo(
    () => buildEntityDefinitionPreview(previewPayload, editorSurfaceMode === 'yaml' ? 'yaml' : 'json'),
    [editorSurfaceMode, previewPayload]
  );

  const telemetryHandoff = useMemo(() => {
    const monitorBinds = Array.isArray(previewPayload.monitorBinds) ? previewPayload.monitorBinds : [];
    const identities = Array.isArray(previewPayload.identities) ? previewPayload.identities : [];
    const isTelemetryDraft = (previewPayload.entity.source || '').trim() === 'otel_resource';
    const handoffSource = previewPayload.entity.labels?.['hertzbeat.discovery.source'] === 'otlp-candidate' ? 'otlp-candidate' : 'telemetry';

    if (!isTelemetryDraft && monitorBinds.length === 0 && identities.length === 0) {
      return null;
    }

    const primaryMonitorId = monitorBinds.find(item => typeof item === 'object' && item != null && 'monitorId' in (item as Record<string, unknown>));
    const resolvedMonitorId =
      primaryMonitorId && typeof primaryMonitorId === 'object'
        ? (primaryMonitorId as { monitorId?: string | number }).monitorId
        : undefined;

    return {
      title: t('entities.editor.telemetry-handoff.title'),
      copy: t('entities.editor.telemetry-handoff.copy'),
      monitorCount: monitorBinds.length,
      monitorCountLabel: t('entities.editor.telemetry-handoff.monitor-count', {
        count: monitorBinds.length
      }),
      identityCount: identities.length,
      identityCountLabel: t('entities.editor.telemetry-handoff.identity-count', {
        count: identities.length
      }),
      source: handoffSource,
      discoveryHref:
        handoffSource === 'otlp-candidate'
          ? buildOtlpCandidateDiscoveryHref(previewPayload) || '/entities/discovery'
          : discoveryReturnHref != null
          ? discoveryReturnHref
          : resolvedMonitorId != null
          ? `/entities/discovery?source=telemetry&monitorId=${encodeURIComponent(String(resolvedMonitorId))}`
          : '/entities/discovery'
    };
  }, [discoveryReturnHref, previewPayload, t]);

  const attributionRows = useMemo(
    () => buildEntityEditorAttributionRows(previewPayload, t, { returnTo: entityReturnHref }),
    [entityReturnHref, previewPayload, t]
  );
  const initialDirtyKey = useMemo(
    () =>
      buildEntityEditorDirtyKey({
        draft: initial,
        labelRows: initialFormState.labelRows,
        tagsText: initialFormState.tagsText,
        links: initial.entity.links || [],
        contacts: initial.entity.contacts || [],
        owners: initial.entity.additionalOwners || [],
        componentOfText: initialFormState.componentOfText,
        componentsText: initialFormState.componentsText,
        implementedByText: initialFormState.implementedByText,
        languagesText: initialFormState.languagesText,
        identitiesItems: initialFormState.identitiesItems,
        monitorBindItems: initialFormState.monitorBindItems,
        relationItems: initialFormState.relationItems
      }),
    [initial, initialFormState]
  );
  const currentDirtyKey = useMemo(
    () =>
      buildEntityEditorDirtyKey({
        draft,
        labelRows,
        tagsText,
        links,
        contacts,
        owners,
        componentOfText,
        componentsText,
        implementedByText,
        languagesText,
        identitiesItems,
        monitorBindItems,
        relationItems
      }),
    [componentOfText, componentsText, contacts, draft, identitiesItems, implementedByText, labelRows, languagesText, links, monitorBindItems, owners, relationItems, tagsText]
  );
  const hasUnsavedChanges = currentDirtyKey !== initialDirtyKey;

  useEffect(() => {
    const incomingMonitorId = incomingMonitorContext?.monitorId;
    if (!incomingMonitorNeedsBinding || !incomingMonitorId) {
      return;
    }

    let cancelled = false;
    setIncomingMonitorPreflightState('loading');
    apiMessageGet<EntityMonitorBindingCandidate[]>(`/entities/monitor/${encodeURIComponent(incomingMonitorId)}/candidates`)
      .then(candidates => {
        if (cancelled) {
          return;
        }
        const conflict = findMonitorBindConflictCandidate(candidates, currentEntityId);
        setMonitorBindCandidateConflicts(current => ({
          ...current,
          [incomingMonitorId]: conflict
        }));
        setIncomingMonitorPreflightState('checked');
        if (conflict != null) {
          setMonitorBindSearchMessage(t('entities.editor.monitor-bind-template.search.already-bound', {
            entity: conflict.entityName || String(conflict.entityId)
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIncomingMonitorPreflightState('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentEntityId, incomingMonitorContext?.monitorId, incomingMonitorNeedsBinding, t]);

  const incomingMonitorConflict = incomingMonitorContext?.monitorId
    ? monitorBindCandidateConflicts[incomingMonitorContext.monitorId] ?? null
    : null;
  const incomingMonitorConflictHref = buildEntityEditorMonitorBindConflictHref(incomingMonitorConflict, entityReturnHref);
  const saveBlockedByIncomingMonitorConflict = mode === 'new' && incomingMonitorConflict != null;
  const saveBlockedByIncomingMonitorPreflight = mode === 'new'
    && incomingMonitorNeedsBinding
    && incomingMonitorPreflightState === 'loading';
  const incomingMonitorIdForSave = incomingMonitorContext?.monitorId?.trim() || '';
  const canAutoDraftIncomingMonitorBind = Boolean(
    mode === 'edit'
    && incomingMonitorNeedsBinding
    && incomingMonitorIdForSave
    && incomingMonitorPreflightState === 'checked'
    && incomingMonitorConflict == null
    && monitorBindTemplateId.trim() === incomingMonitorIdForSave
    && !monitorBindItemsContainMonitor(monitorBindItems, incomingMonitorIdForSave)
  );

  function requestEditorReturn(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!hasUnsavedChanges) {
      return;
    }
    event.preventDefault();
    setDiscardDialogOpen(true);
  }

  function confirmDiscardAndReturn() {
    setDiscardDialogOpen(false);
    navigateEntityEditorAfterSave(router, entityReturnHref);
  }

  const stageRows = useMemo<EntityEditorStageRow[]>(
    () => [
      {
        key: 'basic',
        title: t('entities.editor.stage.basic.label'),
        description: t('entities.editor.stage.basic.description'),
        done: hasNonEmptyText(draft.entity.type) && hasNonEmptyText(draft.entity.name)
      },
      {
        key: 'ownership',
        title: t('entities.editor.stage.ownership.label'),
        description: t('entities.editor.stage.ownership.description'),
        done:
          hasNonEmptyText(draft.entity.owner) ||
          hasNonEmptyText(draft.entity.runbook) ||
          owners.some(owner => hasAnyStructuredValue(owner)) ||
          contacts.some(contact => hasAnyStructuredValue(contact)) ||
          links.some(link => hasAnyStructuredValue(link))
      },
      {
        key: 'signals',
        title: t('entities.editor.stage.signals.label'),
        description: t('entities.editor.stage.signals.description'),
        done: (previewPayload.monitorBinds?.length || 0) > 0
      },
      {
        key: 'relations',
        title: t('entities.editor.stage.relations.label'),
        description: t('entities.editor.stage.relations.description'),
        done:
          hasNonEmptyText(componentOfText) ||
          hasNonEmptyText(componentsText) ||
          hasNonEmptyText(implementedByText) ||
          hasNonEmptyText(languagesText) ||
          hasNonEmptyText(tagsText) ||
          hasNonEmptyText(draft.entity.inheritFrom || '') ||
          hasNonEmptyText(draft.entity.criticality || '') ||
          labelRows.some(row => hasNonEmptyText(row.key) || hasNonEmptyText(row.value)) ||
          (previewPayload.relations?.length || 0) > 0
      }
    ],
    [componentOfText, componentsText, contacts, draft.entity.criticality, draft.entity.inheritFrom, draft.entity.name, draft.entity.owner, draft.entity.runbook, draft.entity.type, implementedByText, labelRows, languagesText, links, owners, previewPayload.monitorBinds, previewPayload.relations, tagsText, t]
  );

  const isCompleteContextStage = mode === 'edit' && Boolean(entityId);
  const coldStageRows = isCompleteContextStage
    ? stageRows.map(stage => (stage.key === 'relations' ? { ...stage, done: true } : stage))
    : stageRows;

  async function save() {
    setSubmitAttempted(true);
    setMessage(null);
    setMessageTone(null);

    if (!hasNonEmptyText(draft.entity.name)) {
      window.requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
      return;
    }
    if (saveBlockedByIncomingMonitorConflict && incomingMonitorContext?.monitorId) {
      setMessage(`Monitor already bound to another entity: ${incomingMonitorContext.monitorId}.`);
      setMessageTone('error');
      setActiveStage('signals');
      setDetailsExpanded(true);
      return;
    }
    if (saveBlockedByIncomingMonitorPreflight) {
      setActiveStage('signals');
      setDetailsExpanded(true);
      return;
    }

    const shouldAutoDraftIncomingMonitorBind = canAutoDraftIncomingMonitorBind;
    const monitorBindItemsForSave = shouldAutoDraftIncomingMonitorBind
      ? replaceFirstEmptyJsonRow(monitorBindItems, buildManualMonitorBindTemplate(incomingMonitorIdForSave))
      : monitorBindItems;
    const hasUnsavedChangesForSave = hasUnsavedChanges || shouldAutoDraftIncomingMonitorBind;

    if (mode === 'edit' && !hasUnsavedChangesForSave) {
      setMessage(t('entities.editor.no-changes'));
      setMessageTone('success');
      return;
    }

    if (shouldAutoDraftIncomingMonitorBind) {
      setMonitorBindItems(monitorBindItemsForSave);
    }

    setSaving(true);
    try {
      const payload: EntityDto = buildEntityPayload(
        {
          draft,
          labelRows,
          tagsText,
          links,
          contacts,
          owners,
          componentOfText,
          componentsText,
          implementedByText,
          languagesText,
          identitiesItems,
          monitorBindItems: monitorBindItemsForSave,
          relationItems
        },
        (label, index) =>
          t('entities.editor.json.invalid', {
            label,
            index
          })
      );

      if (mode === 'new') {
        const existingEntity = await findExistingEntityEditorUniqueName(payload.entity.name || '', currentEntityId);
        if (existingEntity != null) {
          setMessage(`Entity already exists: ${existingEntity.entity?.name || payload.entity.name || ''}.`);
          setMessageTone('error');
          return;
        }
      }

      let createdEntityId: number | null = null;
      const nextMessage =
        mode === 'new'
          ? await saveEntityPayload('new', payload, {
            createEntity: async nextPayload => {
              const id = await apiMessagePost<number>('/entities', nextPayload);
              createdEntityId = id;
              return id;
            },
            updateEntity: nextPayload => apiMessagePut<void>('/entities', nextPayload),
            buildCreateSuccessMessage: id => t('entities.editor.message.create-success', { id }),
            saveSuccessMessage: t('common.save-success'),
            nameRequiredMessage: t('entities.editor.validation.name'),
            jsonObjectRequiredMessage: (label, index) => t('entities.editor.validation.json-object', { label, index }),
            identityIncompleteMessage: index => t('entities.editor.validation.identity-incomplete', { index }),
            monitorBindIncompleteMessage: index => t('entities.editor.validation.monitor-bind-incomplete', { index }),
            relationIncompleteMessage: index => t('entities.editor.validation.relation-incomplete', { index }),
            identityDuplicateMessage: index => t('entities.editor.validation.identity-duplicate', { index }),
            monitorBindDuplicateMessage: index => t('entities.editor.validation.monitor-bind-duplicate', { index }),
            relationDuplicateMessage: index => t('entities.editor.validation.relation-duplicate', { index })
          })
          : await saveEntityPayload('edit', payload, {
            createEntity: nextPayload => apiMessagePost<number>('/entities', nextPayload),
            updateEntity: nextPayload => apiMessagePut<void>('/entities', nextPayload),
            buildCreateSuccessMessage: id => t('entities.editor.message.create-success', { id }),
            saveSuccessMessage: t('common.save-success'),
            nameRequiredMessage: t('entities.editor.validation.name'),
            jsonObjectRequiredMessage: (label, index) => t('entities.editor.validation.json-object', { label, index }),
            identityIncompleteMessage: index => t('entities.editor.validation.identity-incomplete', { index }),
            monitorBindIncompleteMessage: index => t('entities.editor.validation.monitor-bind-incomplete', { index }),
            relationIncompleteMessage: index => t('entities.editor.validation.relation-incomplete', { index }),
            identityDuplicateMessage: index => t('entities.editor.validation.identity-duplicate', { index }),
            monitorBindDuplicateMessage: index => t('entities.editor.validation.monitor-bind-duplicate', { index }),
            relationDuplicateMessage: index => t('entities.editor.validation.relation-duplicate', { index })
          });
      setMessage(nextMessage);
      setMessageTone('success');
      navigateEntityEditorAfterSave(
        router,
        mode === 'new'
          ? buildEntityEditorPostCreateHref({
            createdEntityId,
            returnHref: entityReturnHref,
            source: searchParams.get('source'),
            monitorId: searchParams.get('monitorId'),
            monitorName: searchParams.get('monitorName'),
            monitorApp: searchParams.get('monitorApp'),
            monitorInstance: searchParams.get('monitorInstance')
          })
          : buildEntityEditorPostEditHref({
            entityId: currentEntityId,
            returnHref: entityReturnHref,
            source: searchParams.get('source'),
            monitorId: searchParams.get('monitorId'),
            monitorName: searchParams.get('monitorName'),
            monitorApp: searchParams.get('monitorApp'),
            monitorInstance: searchParams.get('monitorInstance')
          })
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('common.save-failed'));
      setMessageTone('error');
    } finally {
      setSaving(false);
    }
  }

  if (mode === 'new' || mode === 'edit') {
    const isEditMode = mode === 'edit';
    const editorTitle = isEditMode ? t('entities.editor.shell.title.edit') : t('entities.editor.shell.title.new');
    const editorCopy = isEditMode
      ? t('entities.editor.shell.copy.edit')
      : t('entities.editor.shell.copy.new');
    const editorFreshness = isEditMode ? t('entities.editor.shell.freshness.edit') : t('entities.editor.shell.freshness.new');
    const submitLabel = isEditMode ? t('common.save') : t('entities.editor.submit.create');
    const firstViewportSubmitLabel = t('entities.editor.submit.first-viewport-aria', { action: submitLabel });
    const footerSubmitLabel = t('entities.editor.submit.footer-aria', { action: submitLabel });
    const saveDisabledByNoChanges = isEditMode && !hasUnsavedChanges && !canAutoDraftIncomingMonitorBind;
    const saveDisabled = saving || saveDisabledByNoChanges || saveBlockedByIncomingMonitorConflict || saveBlockedByIncomingMonitorPreflight;
    const willSaveWithoutMonitorEvidence = !hasMonitorBindDraft(monitorBindItems);
    const entityNameLabel = t('entities.editor.shell.name-label');
    const nameValidationMessage =
      submitAttempted && !hasNonEmptyText(draft.entity.name) ? t('entities.editor.validation.name') : null;
    const coldFieldLabelTextClassName = 'text-[12px] font-semibold text-[#8d95a5]';
    const coldInputClassName =
      'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] text-[#dbe4f0] placeholder:text-[#6f7787] focus-visible:border-[#4e74f8] focus-visible:bg-[#151923] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]';
    const coldNameInputClassName =
      'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[13px] text-[#f5f7fb] placeholder:text-[#6f7787] focus-visible:border-[#4e74f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]';
    const entityTypeCards: EntityTypeCard[] = [
      { value: 'system', label: t('entities.editor.type.system.label'), description: t('entities.editor.type.system.description'), icon: Network },
      { value: 'service', label: t('entities.editor.type.service.label'), description: t('entities.editor.type.service.description'), icon: Cable },
      { value: 'host', label: t('entities.editor.type.host.label'), description: t('entities.editor.type.host.description'), icon: Monitor },
      { value: 'database', label: t('entities.editor.type.database.label'), description: t('entities.editor.type.database.description'), icon: Database },
      { value: 'queue', label: t('entities.editor.type.queue.label'), description: t('entities.editor.type.queue.description'), icon: ListTree },
      { value: 'middleware', label: t('entities.editor.type.middleware.label'), description: t('entities.editor.type.middleware.description'), icon: Server },
      { value: 'api', label: t('entities.editor.type.api.label'), description: t('entities.editor.type.api.description'), icon: Braces },
      { value: 'endpoint', label: t('entities.editor.type.endpoint.label'), description: t('entities.editor.type.endpoint.description'), icon: Globe2 },
      { value: 'device', label: t('entities.editor.type.device.label'), description: t('entities.editor.type.device.description'), icon: Layers3 },
      { value: 'k8s_workload', label: t('entities.editor.type.k8s-workload.label'), description: t('entities.editor.type.k8s-workload.description'), icon: Boxes }
    ];
    const entrySources: EntitySourceOption[] = [
      { value: 'manual', label: t('entities.editor.entry-source.manual'), icon: PencilLine },
      { value: 'otel_resource', label: t('entities.editor.entry-source.telemetry'), icon: Network },
      { value: 'definition', label: t('entities.editor.entry-source.definition'), icon: Braces }
    ];
    const editorStages = [
      {
        key: 'basic' as const,
        label: t('entities.editor.stage.basic.label'),
        description: t('entities.editor.stage.basic.description'),
        requirementLabel: t('entities.editor.stage.required'),
        requirementTone: 'required' as const,
        help: t('entities.editor.stage.basic.help'),
        impact: t('entities.editor.stage.basic.impact')
      },
      {
        key: 'ownership' as const,
        label: t('entities.editor.stage.ownership.label'),
        description: t('entities.editor.stage.ownership.description'),
        requirementLabel: t('entities.editor.stage.recommended'),
        requirementTone: 'recommended' as const,
        help: t('entities.editor.stage.ownership.help'),
        impact: t('entities.editor.stage.ownership.impact')
      },
      {
        key: 'signals' as const,
        label: t('entities.editor.stage.signals.label'),
        description: t('entities.editor.stage.signals.description'),
        requirementLabel: t('entities.editor.stage.recommended'),
        requirementTone: 'recommended' as const,
        help: t('entities.editor.stage.signals.help'),
        impact: t('entities.editor.stage.signals.impact')
      },
      {
        key: 'relations' as const,
        label: t('entities.editor.stage.relations.label'),
        description: t('entities.editor.stage.relations.description'),
        requirementLabel: t('entities.editor.stage.optional'),
        requirementTone: 'optional' as const,
        help: t('entities.editor.stage.relations.help'),
        impact: t('entities.editor.stage.relations.impact')
      }
    ];
    const routeTabs = [
      { key: 'detail', label: t('entities.editor.route-tab.detail') },
      { key: 'monitor', label: t('entities.editor.route-tab.monitor') },
      { key: 'logs', label: t('entities.editor.route-tab.logs') },
      { key: 'traces', label: t('entities.editor.route-tab.traces') }
    ];
    const activeStageCopy = editorStages.find(stage => stage.key === activeStage) || editorStages[0];
    const selectedEntrySource = entrySources.some(source => source.value === (draft.entity.source || '').trim())
      ? ((draft.entity.source || '').trim() as EntitySourceOption['value'])
      : 'manual';
    const entityReturnContract = entityReturnHref === '/entities' ? 'entity-list-root' : 'safe-return-context-or-entity-list';
    const entityDetailReturnPath = entityId ? `/entities/${encodeURIComponent(entityId)}` : null;
    const entityReturnKind = entityReturnHref.startsWith('/monitors/')
      ? 'monitor-detail'
      : entityReturnHref === '/entities/discovery' || entityReturnHref.startsWith('/entities/discovery?')
        ? 'entity-discovery'
        : entityDetailReturnPath != null
          && (entityReturnHref === entityDetailReturnPath
            || entityReturnHref.startsWith(`${entityDetailReturnPath}?`)
            || entityReturnHref.startsWith(`${entityDetailReturnPath}#`))
          ? 'entity-detail'
        : 'entity-list';
    const entityReturnLabel =
      entityReturnKind === 'monitor-detail'
        ? t('entities.editor.shell.monitor-detail')
        : entityReturnKind === 'entity-discovery'
          ? t('entities.editor.shell.entity-discovery')
          : entityReturnKind === 'entity-detail'
            ? t('entities.editor.shell.entity-detail')
          : t('entities.editor.shell.all-entities');
    const entityReturnHelpLabel =
      entityReturnKind === 'monitor-detail'
        ? t('entities.editor.action.return-monitor.help-label')
        : entityReturnKind === 'entity-discovery'
          ? t('entities.editor.action.return-discovery.help-label')
          : entityReturnKind === 'entity-detail'
            ? t('entities.editor.action.return-entity-detail.help-label')
          : t('entities.editor.action.all-entities.help-label');
    const entityReturnHelpCopy =
      entityReturnKind === 'monitor-detail'
        ? t('entities.editor.action.return-monitor.help')
        : entityReturnKind === 'entity-discovery'
          ? t('entities.editor.action.return-discovery.help')
          : entityReturnKind === 'entity-detail'
            ? t('entities.editor.action.return-entity-detail.help')
          : t('entities.editor.action.all-entities.help');
    const cancelHelpCopy =
      entityReturnKind === 'monitor-detail'
        ? t('entities.editor.action.cancel.monitor-help')
        : entityReturnKind === 'entity-discovery'
          ? t('entities.editor.action.cancel.discovery-help')
          : entityReturnKind === 'entity-detail'
            ? t('entities.editor.action.cancel.entity-detail-help')
          : t('entities.editor.action.cancel.help');
    const bodyDataAttrs = detailsExpanded
      ? { 'data-entity-editor-body': 'hertzbeat-ui-single-stage' }
      : { 'data-entity-editor-body-placement': 'hertzbeat-ui-deferred-body' };
    const definitionModeTabs = [
      { value: 'editor', label: t('entities.editor.mode.editor') },
      { value: 'yaml', label: 'YAML' },
      { value: 'json', label: 'JSON' }
    ];
    const manualInputModeLabel = t('entities.editor.field.input-mode.manual');
    const manualInputModeHelp = t('entities.editor.field.input-mode.manual.help');
    const selectionInputModeLabel = t('entities.editor.field.input-mode.selection');
    const selectionInputModeHelp = t('entities.editor.field.input-mode.selection.help');
    const catalogInputModeLabel = t('entities.editor.field.input-mode.catalog');
    const catalogInputModeHelp = t('entities.editor.field.input-mode.catalog.help');
    const fieldRequirementLabels: Record<EntityEditorFieldRequirement, string> = {
      required: t('entities.editor.field.requirement.required'),
      recommended: t('entities.editor.field.requirement.recommended'),
      optional: t('entities.editor.field.requirement.optional')
    };
    const identityDraftReady = hasJsonObjectDraft(identitiesItems);
    const monitorDraftReady = hasMonitorBindDraft(monitorBindItems);
    const relationDraftReady = Boolean(hasJsonObjectDraft(relationItems) || componentOfText.trim() || componentsText.trim());
    const ownershipDraftReady = hasNonEmptyText(draft.entity.owner);
    const modelingChecklistRows = [
      {
        key: 'identity',
        title: t('entities.editor.modeling-checklist.identity.title'),
        copy: identityDraftReady
          ? t('entities.editor.modeling-checklist.identity.ready')
          : t('entities.editor.modeling-checklist.identity.next'),
        state: identityDraftReady ? 'ready' : 'next'
      },
      {
        key: 'evidence',
        title: t('entities.editor.modeling-checklist.evidence.title'),
        copy: monitorDraftReady
          ? t('entities.editor.modeling-checklist.evidence.ready')
          : t('entities.editor.modeling-checklist.evidence.next'),
        state: monitorDraftReady ? 'ready' : 'next'
      },
      {
        key: 'relations',
        title: t('entities.editor.modeling-checklist.relations.title'),
        copy: relationDraftReady
          ? t('entities.editor.modeling-checklist.relations.ready')
          : t('entities.editor.modeling-checklist.relations.next'),
        state: relationDraftReady ? 'ready' : 'review'
      }
    ];
    const visibleMessage = resolveVisibleEntityEditorMessage(message, messageTone, t);
    const duplicateRecoveryHref = resolveEntityEditorDuplicateRecoveryHref(message, messageTone, draft.entity.name);
    const monitorBindConflictRecoveryHref = resolveEntityEditorMonitorBindConflictRecoveryHref(
      message,
      messageTone,
      monitorBindCandidateConflicts,
      entityReturnHref
    );
    const showBackendRetry = shouldShowEntityEditorBackendRetry(message, messageTone);
    const subtypeSuggestions = entitySubtypeSuggestionsByType[draft.entity.type || 'service'] || entitySubtypeSuggestionsByType.service;
    const serviceIdentityTemplate = JSON.stringify(
      {
        identityType: 'otel_resource',
        identityKey: 'service.name',
        identityValue: draft.entity.name || '',
        primaryIdentity: true
      },
      null,
      2
    );
    const serviceIdentityTemplateDisabled = !hasNonEmptyText(draft.entity.name);
    const applyServiceIdentityTemplate = () => {
      setIdentitiesItems(current => replaceFirstEmptyJsonRow(current, serviceIdentityTemplate));
      setActiveStage('signals');
      setDetailsExpanded(true);
    };
    const normalizedMonitorBindTemplateId = monitorBindTemplateId.trim();
    const monitorBindTemplate = buildManualMonitorBindTemplate(normalizedMonitorBindTemplateId);
    const monitorBindTemplateMatchesIncoming = Boolean(
      incomingMonitorContext?.monitorId
      && normalizedMonitorBindTemplateId === incomingMonitorContext.monitorId
    );
    const monitorBindTemplateAlreadyDrafted = monitorBindItemsContainMonitor(monitorBindItems, normalizedMonitorBindTemplateId);
    const monitorBindTemplateWaitingForPreflight = incomingMonitorNeedsBinding
      && monitorBindTemplateMatchesIncoming
      && incomingMonitorPreflightState === 'loading';
    const monitorBindTemplateBlockedByIncomingConflict = incomingMonitorNeedsBinding
      && monitorBindTemplateMatchesIncoming
      && incomingMonitorConflict != null;
    const monitorBindTemplateDisabled = !hasNonEmptyText(normalizedMonitorBindTemplateId)
      || monitorBindTemplateWaitingForPreflight
      || monitorBindTemplateBlockedByIncomingConflict
      || monitorBindTemplateAlreadyDrafted;
    const monitorBindTemplatePreviewCopy = monitorBindTemplateWaitingForPreflight
      ? t('entities.editor.monitor-bind-template.incoming.preflight-loading')
      : monitorBindTemplateBlockedByIncomingConflict && incomingMonitorConflict
      ? t('entities.editor.monitor-bind-template.incoming.preflight-conflict', {
        entity: incomingMonitorConflict.entityName || String(incomingMonitorConflict.entityId)
      })
      : monitorBindTemplateAlreadyDrafted
      ? t('entities.editor.monitor-bind-template.manual-monitor.already-drafted', { monitorId: normalizedMonitorBindTemplateId })
      : !hasNonEmptyText(normalizedMonitorBindTemplateId)
      ? t('entities.editor.monitor-bind-template.manual-monitor.needs-monitor')
      : t('entities.editor.monitor-bind-template.manual-monitor.preview', { monitorId: normalizedMonitorBindTemplateId });
    const monitorBindingDraftedForTemplate = Boolean(
      normalizedMonitorBindTemplateId
      && monitorBindItemsContainMonitor(monitorBindItems, normalizedMonitorBindTemplateId)
    );
    const applyMonitorBindTemplate = () => {
      if (monitorBindTemplateDisabled) {
        return;
      }
      setMonitorBindItems(current => replaceFirstEmptyJsonRow(current, monitorBindTemplate));
      setActiveStage('signals');
      setDetailsExpanded(true);
    };
    const buildMonitorBindTemplateFromMonitor = (monitor: MonitorDto) => buildManualMonitorBindTemplate(monitor.id);
    const loadMonitorBindCandidateConflict = async (monitor: MonitorDto) => {
      try {
        const candidates = await apiMessageGet<EntityMonitorBindingCandidate[]>(
          `/entities/monitor/${encodeURIComponent(String(monitor.id))}/candidates`
        );
        return findMonitorBindConflictCandidate(candidates, currentEntityId);
      } catch {
        return null;
      }
    };
    const loadMonitorBindCandidatePage = async (normalizedSearch: string, pageIndex: number, append: boolean) => {
      setMonitorBindSearchLoading(true);
      setMonitorBindSearchLoadingMore(append);
      if (!append) {
        setMonitorBindSearchMessage(null);
      }
      try {
        const params = new URLSearchParams({
          pageIndex: String(pageIndex),
          pageSize: String(ENTITY_EDITOR_MONITOR_BIND_SEARCH_PAGE_SIZE),
          search: normalizedSearch
        });
        const page = await apiMessageGet<PageResult<MonitorDto>>(`/monitors?${params.toString()}`);
        const monitors = page.content || [];
        const conflicts = Object.fromEntries(
          await Promise.all(monitors.map(async monitor => [String(monitor.id), await loadMonitorBindCandidateConflict(monitor)]))
        ) as Record<string, EntityMonitorBindingCandidate | null>;
        const nextCandidates = append
          ? Array.from(new Map([...monitorBindCandidates, ...monitors].map(monitor => [String(monitor.id), monitor])).values())
          : monitors;
        const nextConflicts = append
          ? { ...monitorBindCandidateConflicts, ...conflicts }
          : conflicts;
        const reportedTotal = page.totalElements || 0;
        const nextTotal = append && monitors.length === 0
          ? nextCandidates.length
          : Math.max(reportedTotal, nextCandidates.length);

        setMonitorBindCandidateConflicts(nextConflicts);
        setMonitorBindCandidates(nextCandidates);
        setMonitorBindSearchTotal(nextTotal);
        setMonitorBindSearchPageIndex(page.pageIndex ?? pageIndex);
        setMonitorBindSearchResolvedQuery(normalizedSearch);
        const hasConflicts = Object.values(nextConflicts).some(Boolean);
        setMonitorBindSearchMessage(
          nextCandidates.length > 0
            ? t(
              hasConflicts
                ? 'entities.editor.monitor-bind-template.search.result-progress-with-conflict'
                : 'entities.editor.monitor-bind-template.search.result-progress',
              { visible: nextCandidates.length, total: nextTotal }
            )
            : t('entities.editor.monitor-bind-template.search.empty')
        );
      } catch (error) {
        if (!append) {
          setMonitorBindCandidates([]);
          setMonitorBindCandidateConflicts({});
          setMonitorBindSearchTotal(0);
          setMonitorBindSearchPageIndex(0);
          setMonitorBindSearchResolvedQuery('');
        }
        setMonitorBindSearchMessage(error instanceof Error ? error.message : t('entities.editor.monitor-bind-template.search.failed'));
      } finally {
        setMonitorBindSearchLoading(false);
        setMonitorBindSearchLoadingMore(false);
      }
    };
    const searchMonitorBindCandidates = async () => {
      const normalizedSearch = monitorBindSearch.trim();
      if (!hasNonEmptyText(normalizedSearch)) {
        setMonitorBindSearchMessage(t('entities.editor.monitor-bind-template.search.needs-query'));
        setMonitorBindCandidates([]);
        setMonitorBindCandidateConflicts({});
        setMonitorBindSearchTotal(0);
        setMonitorBindSearchPageIndex(0);
        setMonitorBindSearchResolvedQuery('');
        return;
      }

      await loadMonitorBindCandidatePage(normalizedSearch, 0, false);
    };
    const loadMoreMonitorBindCandidates = async () => {
      if (
        monitorBindSearchLoading
        || !hasNonEmptyText(monitorBindSearchResolvedQuery)
        || monitorBindCandidates.length >= monitorBindSearchTotal
      ) {
        return;
      }
      await loadMonitorBindCandidatePage(monitorBindSearchResolvedQuery, monitorBindSearchPageIndex + 1, true);
    };
    const applyMonitorBindCandidate = (monitor: MonitorDto) => {
      const conflict = monitorBindCandidateConflicts[String(monitor.id)];
      if (conflict != null) {
        setMonitorBindSearchMessage(t('entities.editor.monitor-bind-template.search.already-bound', {
          entity: conflict.entityName || String(conflict.entityId)
        }));
        return;
      }
      if (monitorBindItemsContainMonitor(monitorBindItems, String(monitor.id))) {
        setMonitorBindSearchMessage(t('entities.editor.monitor-bind-template.manual-monitor.already-drafted', {
          monitorId: String(monitor.id)
        }));
        return;
      }
      setMonitorBindItems(current => replaceFirstEmptyJsonRow(current, buildMonitorBindTemplateFromMonitor(monitor)));
      setMonitorBindTemplateId(String(monitor.id));
      setMonitorBindSearchMessage(t('entities.editor.monitor-bind-template.search.selected', { name: monitor.name || String(monitor.id) }));
      setActiveStage('signals');
      setDetailsExpanded(true);
    };
    const normalizedRelationTargetRef = relationTargetRef.trim();
    const dependencyRelationTemplate = JSON.stringify(
      {
        targetRef: normalizedRelationTargetRef,
        relationType: 'depends_on',
        relationSource: 'manual',
        status: 'confirmed',
        score: 100
      },
      null,
      2
    );
    const dependencyRelationTemplateDisabled = !hasNonEmptyText(normalizedRelationTargetRef);
    const applyDependencyRelationTemplate = () => {
      if (dependencyRelationTemplateDisabled) {
        return;
      }
      setRelationItems(current => replaceFirstEmptyJsonRow(current, dependencyRelationTemplate));
      setActiveStage('relations');
      setDetailsExpanded(true);
    };

    const renderField = (
      label: string,
      value: string,
      placeholder: string,
      onChange: (value: string) => void,
      fieldKey: string,
      options: EntityEditorFieldOptions = {}
    ) => {
      const inputId = `entity-editor-field-${fieldKey}`;
      const helpId = `${inputId}-help`;
      const suggestionValues = normalizeSuggestions(options.suggestions);
      const datalistSuggestionValues = suggestionValues.slice(0, ENTITY_EDITOR_DATALIST_SUGGESTION_LIMIT);
      const listId = suggestionValues.length > 0 ? `${inputId}-suggestions` : undefined;
      const visibleSuggestionValues = suggestionValues.slice(0, 4);
      const resolvedInputMode = options.inputMode ?? (suggestionValues.length > 0 ? 'suggestions' : options.suggestionCapable ? 'catalog' : 'manual');
      const inputModeLabel =
        resolvedInputMode === 'suggestions'
          ? t('entities.editor.field.input-mode.suggestions')
          : resolvedInputMode === 'catalog'
            ? catalogInputModeLabel
          : resolvedInputMode === 'selection'
            ? selectionInputModeLabel
          : t('entities.editor.field.input-mode.manual');
      const inputModeHelp =
        resolvedInputMode === 'suggestions'
          ? t('entities.editor.field.input-mode.suggestions.help')
          : resolvedInputMode === 'catalog'
            ? catalogInputModeHelp
          : resolvedInputMode === 'selection'
            ? selectionInputModeHelp
          : t('entities.editor.field.input-mode.manual.help');
      const requirement = options.requirement ?? 'optional';

      return (
        <div className={cn('grid gap-2', options.extraClassName)}>
          <EntityEditorFieldTitle
            label={label}
            fieldKey={fieldKey}
            help={options.help}
            impact={options.impact}
            helpId={helpId}
            helpLabel={t('entities.editor.field.help-aria', { field: label })}
            inputMode={resolvedInputMode}
            inputModeLabel={inputModeLabel}
            inputModeHelp={inputModeHelp}
            requirement={requirement}
            requirementLabel={fieldRequirementLabels[requirement]}
          />
          <Input
            id={inputId}
            list={listId}
            aria-label={options.ariaLabel || label}
            aria-describedby={options.help ? helpId : undefined}
            data-entity-editor-input={fieldKey}
            className={coldInputClassName}
            value={value}
            placeholder={placeholder}
            onChange={event => onChange(event.target.value)}
          />
          {listId ? (
            <datalist
              id={listId}
              data-entity-editor-field-suggestions={fieldKey}
              data-entity-editor-field-suggestion-total={suggestionValues.length}
              data-entity-editor-field-suggestion-rendered={datalistSuggestionValues.length}
              data-entity-editor-field-suggestion-limit={ENTITY_EDITOR_DATALIST_SUGGESTION_LIMIT}
              data-entity-editor-field-suggestion-overflow={
                suggestionValues.length > datalistSuggestionValues.length ? 'bounded-datalist' : 'none'
              }
            >
              {datalistSuggestionValues.map(suggestion => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          ) : null}
          {visibleSuggestionValues.length > 0 ? (
            <div
              data-entity-editor-suggestion-picker={fieldKey}
              className="flex min-h-6 flex-wrap items-center gap-1.5"
            >
              <span className="text-[10px] font-semibold text-[#6f7787]">{t('entities.editor.field.suggestions-available')}</span>
              {visibleSuggestionValues.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  aria-label={t('entities.editor.field.suggestion.use', { field: label, value: suggestion })}
                  data-entity-editor-suggestion-action={fieldKey}
                  data-entity-editor-suggestion-value={suggestion}
                  className={cn(
                    'inline-flex h-6 max-w-[160px] items-center truncate rounded-[3px] border px-2 text-[11px] font-semibold transition-colors',
                    value === suggestion
                      ? 'border-[#4e74f8] bg-[#182238] text-[#f5f7fb]'
                      : 'border-[#2b3039] bg-[#101217] text-[#a8b0bf] hover:border-[#3b4454] hover:text-[#dbe4f0]'
                  )}
                  onClick={() => onChange(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    };

    const renderSelectField = (
      label: string,
      value: string,
      onChange: (value: string) => void,
      fieldKey: string,
      options: EntitySourceOption[],
      fieldOptions: EntityEditorFieldOptions = {}
    ) => {
      const inputId = `entity-editor-field-${fieldKey}`;
      const helpId = `${inputId}-help`;
      const requirement = fieldOptions.requirement ?? 'optional';

      return (
        <div className={cn('grid gap-2', fieldOptions.extraClassName)}>
          <EntityEditorFieldTitle
            label={label}
            fieldKey={fieldKey}
            help={fieldOptions.help}
            impact={fieldOptions.impact}
            helpId={helpId}
            helpLabel={t('entities.editor.field.help-aria', { field: label })}
            inputMode="selection"
            inputModeLabel={selectionInputModeLabel}
            inputModeHelp={selectionInputModeHelp}
            requirement={requirement}
            requirementLabel={fieldRequirementLabels[requirement]}
          />
          <Select
            id={inputId}
            aria-label={fieldOptions.ariaLabel || label}
            aria-describedby={fieldOptions.help ? helpId : undefined}
            data-entity-editor-select={fieldKey}
            className={coldInputClassName}
            value={value || options[0]?.value || ''}
            onValueChange={onChange}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      );
    };

    return (
      <form
        data-entity-editor-form="true"
        noValidate
        onSubmit={event => {
          event.preventDefault();
          void save();
        }}
      >
        <div
          data-entity-editor-shell="otlp-hertzbeat-ui-entity-composer"
          data-entity-editor-style-baseline="hertzbeat-ui-matte"
          data-entity-editor-layout="full-width-workbench"
          className="grid gap-3 text-[#dbe4f0]"
        >
          <header data-entity-editor-header="hertzbeat-ui-compact-header" className="grid gap-2">
            <div className="text-[12px] font-medium text-[#98a2b3]">{t('entities.editor.shell.kicker')}</div>
            <div data-entity-editor-header-rhythm="hertzbeat-ui-compact" className="mb-1 grid gap-2">
              <h1
                data-entity-editor-page-heading="true"
                className="text-[24px] font-semibold leading-none text-[#f5f7fb]"
              >
                {editorTitle}
              </h1>
              <p className="text-[13px] leading-5 text-[#a8b0bf]">{editorCopy}</p>
              <div data-entity-editor-route-tabs="hertzbeat-ui-segmented-tabs" className="flex flex-wrap gap-2">
                {routeTabs.map((tab, index) => (
                  <span
                    key={tab.key}
                    className={cn(
                      'inline-flex h-8 items-center border px-3 text-[12px] font-semibold',
                      index === 0
                        ? 'rounded-[3px] border-[#31405c] bg-[#182238] text-[#f5f7fb]'
                        : 'rounded-[3px] border-[#2b3039] bg-[#101217] text-[#98a2b3]'
                    )}
                  >
                    {tab.label}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <section
            data-entity-editor-frame="hertzbeat-ui-unframed-editor-band"
            data-entity-editor-frame-spacing="hertzbeat-ui-tight"
            data-entity-editor-nested-card-policy="no-card-inside-card"
            className="grid gap-3"
          >
            <div
              data-entity-editor-summary-card="hertzbeat-ui-unframed-editor-section"
              data-entity-editor-summary-section="hertzbeat-ui-unframed-editor-section"
              className="grid min-w-0 gap-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2b3039] pb-3">
                <div className="grid gap-2">
                  <EntityEditorActionWithHelp
                    helpId="all-entities"
                    helpLabel={entityReturnHelpLabel}
                    helpCopy={entityReturnHelpCopy}
                  >
                    <Link
                      href={entityReturnHref}
                      data-entity-editor-command-action="return"
                      data-entity-editor-all-entities-return={entityReturnContract}
                      data-entity-editor-all-entities-return-kind={entityReturnKind}
                      data-entity-editor-all-entities-return-target={entityReturnHref}
                      data-entity-editor-unsaved-return-guard={hasUnsavedChanges ? 'dirty' : 'clean'}
                      className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#d8e4ff]"
                      onClick={requestEditorReturn}
                    >
                      <span aria-hidden="true">←</span>
                      {entityReturnLabel}
                    </Link>
                  </EntityEditorActionWithHelp>
                  {isEditMode && entityId ? (
                    <Link
                      href={`/entities/${entityId}/definition`}
                      data-entity-editor-definition-handoff="hertzbeat-ui-hidden"
                      className="sr-only"
                    >
                      {t('entities.editor.shell.definition-workspace')}
                    </Link>
                  ) : null}
                  <div className="grid gap-1">
                    <div className="text-[11px] font-semibold text-[#8d95a5]">{t('entities.editor.shell.entity-label')}</div>
                    <h2
                      data-entity-editor-form-heading="true"
                      className="text-[18px] font-semibold leading-none text-[#f5f7fb]"
                    >
                      {editorTitle}
                    </h2>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <EntityEditorActionWithHelp
                    helpId="preview-toggle"
                    helpLabel={t('entities.editor.action.preview-toggle.help-label')}
                    helpCopy={t('entities.editor.action.preview-toggle.help')}
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      data-entity-editor-command-action="preview-toggle"
                      data-entity-editor-preview-toggle="true"
                      className="h-8 rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151923]"
                      onClick={() => setPreviewRailCollapsed(current => !current)}
                    >
                      <ListTree size={14} aria-hidden="true" data-entity-editor-preview-toggle-icon="cold" />
                      {previewRailCollapsed ? t('entities.editor.shell.preview.show') : t('entities.editor.shell.preview.hide')}
                    </Button>
                  </EntityEditorActionWithHelp>
                  <span className="inline-flex min-h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[11px] text-[#98a2b3]">
                    {t('entities.editor.shell.definition-version')}
                  </span>
                  <span className="inline-flex min-h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[11px] text-[#98a2b3]">
                    {editorFreshness}
                  </span>
                  <div
                    data-entity-editor-top-actions="first-viewport-completion"
                    data-entity-editor-top-actions-owner="hertzbeat-ui-inline-actions"
                    className="flex flex-wrap items-center justify-end gap-2"
                  >
                    <Link
                      href={entityReturnHref}
                      data-entity-editor-command-action="top-cancel"
                      data-entity-editor-top-cancel-return={entityReturnContract}
                      data-entity-editor-top-cancel-return-target={entityReturnHref}
                      data-entity-editor-unsaved-return-guard={hasUnsavedChanges ? 'dirty' : 'clean'}
                      className={buttonVariants({ variant: 'subtle', size: 'sm' })}
                      onClick={requestEditorReturn}
                    >
                      {t('common.cancel')}
                    </Link>
                    <Button
                      type="submit"
                      size="sm"
                      variant="primary"
                      aria-label={firstViewportSubmitLabel}
                      disabled={saveDisabled}
                      data-entity-editor-command-action="top-submit"
                      data-entity-editor-submit-placement="first-viewport"
                      data-entity-editor-submit-blocked-by-monitor-conflict={saveBlockedByIncomingMonitorConflict ? 'true' : undefined}
                      data-entity-editor-submit-waiting-for-monitor-preflight={saveBlockedByIncomingMonitorPreflight ? 'true' : undefined}
                    >
                      {saving ? t('common.saving') : submitLabel}
                    </Button>
                  </div>
                </div>
              </div>

              {visibleMessage ? (
                <div
                  role={messageTone === 'error' ? 'alert' : 'status'}
                  data-entity-editor-feedback="first-viewport"
                  data-entity-editor-feedback-tone={messageTone === 'error' ? 'error' : 'success'}
                  className={cn(
                    'inline-flex min-h-8 flex-wrap items-center gap-2 rounded-[3px] border px-3 text-[11px] font-semibold',
                    messageTone === 'error'
                      ? 'border-[#5b2c32] bg-[#211114] text-[#f0a7af]'
                      : 'border-[#31405c] bg-[#111724] text-[#d8e4ff]'
                  )}
                >
                  <span>{visibleMessage}</span>
                  {duplicateRecoveryHref ? (
                    <Link
                      href={duplicateRecoveryHref}
                      data-entity-editor-duplicate-recovery-link="true"
                      data-entity-editor-duplicate-recovery-placement="first-viewport"
                      className="rounded-[3px] border border-[#31405c] bg-[#182238] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#202a42]"
                    >
                      {t('entities.editor.message.duplicate-recovery.open-existing')}
                    </Link>
                  ) : null}
                  {monitorBindConflictRecoveryHref ? (
                    <Link
                      href={monitorBindConflictRecoveryHref}
                      data-entity-editor-monitor-bind-conflict-recovery-link="true"
                      data-entity-editor-monitor-bind-conflict-recovery-placement="first-viewport"
                      className="rounded-[3px] border border-[#31405c] bg-[#182238] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#202a42]"
                    >
                      {t('entities.editor.message.monitor-bind-conflict.open-existing')}
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {willSaveWithoutMonitorEvidence ? (
                <div
                  role="status"
                  data-entity-editor-status-lifecycle="no-live-evidence-bound"
                  data-entity-editor-status-lifecycle-owner="hertzbeat-ui-inline-feedback"
                  className="rounded-[3px] border border-[#303743] bg-[#101217] px-3 py-2 text-[11px] leading-5 text-[#a8b0bf]"
                >
                  <span className="font-semibold text-[#dbe4f0]">{t('entities.editor.status-lifecycle.no-live-evidence.title')}</span>
                  <span className="ml-2">{t('entities.editor.status-lifecycle.no-live-evidence.copy')}</span>
                </div>
              ) : null}

              <div className="grid gap-2">
                <div className="grid gap-2">
                  <EntityEditorFieldTitle
                    label={entityNameLabel}
                    fieldKey="name"
                    help={t('entities.editor.field.name.help')}
                    impact={t('entities.editor.field.name.impact')}
                    helpId="entity-editor-field-name-help"
                    helpLabel={t('entities.editor.field.help-aria', { field: entityNameLabel })}
                    inputMode="manual"
                    inputModeLabel={t('entities.editor.field.input-mode.manual')}
                    inputModeHelp={t('entities.editor.field.input-mode.manual.help')}
                    requirement="required"
                    requirementLabel={fieldRequirementLabels.required}
                  />
                  <Input
                    ref={nameInputRef}
                    id="entity-editor-field-name"
                    aria-label={entityNameLabel}
                    aria-describedby={nameValidationMessage ? 'entity-editor-field-name-help entity-editor-field-name-validation' : 'entity-editor-field-name-help'}
                    aria-invalid={nameValidationMessage ? 'true' : undefined}
                    data-entity-editor-input="name"
                    className={coldNameInputClassName}
                    required
                    maxLength={128}
                    value={draft.entity.name || ''}
                    placeholder={t('entities.editor.shell.name-placeholder')}
                    onChange={event => updateEntityField('name', event.target.value)}
                  />
                  {nameValidationMessage ? (
                    <div
                      id="entity-editor-field-name-validation"
                      role="alert"
                      data-entity-editor-validation="name"
                      className="text-[11px] font-semibold text-[#f0a7af]"
                    >
                      {nameValidationMessage}
                    </div>
                  ) : null}
                  {!identityDraftReady ? (
                    <button
                      type="button"
                      data-entity-editor-name-identity-action="service-name"
                      className="w-fit rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-[#eef4ff] disabled:cursor-not-allowed disabled:border-[#252b34] disabled:text-[#6f7787]"
                      disabled={serviceIdentityTemplateDisabled}
                      onClick={applyServiceIdentityTemplate}
                    >
                      {t('entities.editor.identity-template.service-name.action')}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-4 max-xl:grid-cols-1">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <EntityEditorFieldTitle
                      label={t('entities.editor.shell.type-label')}
                      fieldKey="type"
                      help={t('entities.editor.field.type.help')}
                      impact={t('entities.editor.field.type.impact')}
                      helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.shell.type-label') })}
                      inputMode="selection"
                      inputModeLabel={selectionInputModeLabel}
                      inputModeHelp={selectionInputModeHelp}
                      requirement="required"
                      requirementLabel={fieldRequirementLabels.required}
                    />
                    <div
                      data-entity-editor-type-strip="hertzbeat-ui-catalog-grid"
                      data-entity-editor-type-strip-layout="hertzbeat-ui-compact-grid"
                      className="grid gap-2 md:grid-cols-3 xl:grid-cols-4"
                    >
                      {entityTypeCards.map(card => {
                        const active = (draft.entity.type || 'service') === card.value;
                        const TypeIcon = card.icon;
                        return (
                          <button
                            key={card.value}
                            type="button"
                            data-entity-editor-type-card-density="hertzbeat-ui-compact-card"
                            className={cn(
                              'flex min-h-[46px] items-center gap-2 border px-3 py-1.5 text-left transition-colors',
                              cn('rounded-[4px]', active ? 'border-[#4e74f8] bg-[#182238]' : 'border-[#2b3039] bg-[#101217] hover:border-[#3b4454] hover:bg-[#151923]')
                            )}
                            onClick={() => updateEntityField('type', card.value)}
                          >
                            <span
                              data-entity-type-icon-frame="hertzbeat-ui-unframed-icon"
                              className="inline-flex h-5 w-5 flex-none items-center justify-center text-[#d8e4ff]"
                            >
                              <TypeIcon
                                aria-hidden="true"
                                data-entity-type-icon={card.value}
                                className="h-4 w-4 stroke-[2]"
                              />
                            </span>
                            <span className="grid gap-0.5">
                              <span className="text-[13px] font-semibold text-[#f5f7fb]">{card.label}</span>
                              {active ? <span className="line-clamp-1 text-[11px] text-[#98a2b3]">{card.description}</span> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <EntityEditorFieldTitle
                      label={t('entities.editor.shell.entry-source-label')}
                      fieldKey="entry-source"
                      help={t('entities.editor.field.entry-source.help')}
                      impact={t('entities.editor.field.entry-source.impact')}
                      helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.shell.entry-source-label') })}
                      inputMode="selection"
                      inputModeLabel={selectionInputModeLabel}
                      inputModeHelp={selectionInputModeHelp}
                      requirement="required"
                      requirementLabel={fieldRequirementLabels.required}
                    />
                    <div data-entity-editor-entry-strip="hertzbeat-ui-segmented-pills" className="inline-flex rounded-[3px] border border-[#2b3039] bg-[#101217] p-[3px]">
                      {entrySources.map(source => {
                        const EntryIcon = source.icon;
                        return (
                          <button
                            key={source.value}
                            type="button"
                            className={cn(
                              'inline-flex min-h-[28px] items-center gap-1.5 px-3 text-[12px] font-semibold',
                              cn('rounded-[3px]', selectedEntrySource === source.value ? 'border border-[#31405c] bg-[#182238] text-[#f5f7fb]' : 'border border-transparent text-[#98a2b3]')
                            )}
                            onClick={() => updateEntityField('source', source.value)}
                          >
                            <EntryIcon
                              aria-hidden="true"
                              data-entity-entry-source-icon={source.value}
                              className="h-3.5 w-3.5 stroke-[2]"
                            />
                            <span>{source.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    data-entity-editor-modeling-checklist="identity-evidence-relations"
                    data-entity-editor-modeling-checklist-owner="hertzbeat-ui-inline-readiness"
                    className="grid gap-2 border-y border-[#2b3039] py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d95a5]">
                        {t('entities.editor.modeling-checklist.title')}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {!ownershipDraftReady ? (
                          <button
                            type="button"
                            data-entity-editor-modeling-checklist-action="open-ownership"
                            className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-[#eef4ff]"
                            onClick={() => {
                              setActiveStage('ownership');
                              setDetailsExpanded(true);
                            }}
                          >
                            {t('entities.editor.modeling-checklist.action.ownership')}
                          </button>
                        ) : null}
                        {!identityDraftReady ? (
                          <button
                            type="button"
                            data-entity-editor-modeling-checklist-action="apply-service-name"
                            className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-[#eef4ff] disabled:cursor-not-allowed disabled:border-[#252b34] disabled:text-[#6f7787]"
                            disabled={serviceIdentityTemplateDisabled}
                            onClick={applyServiceIdentityTemplate}
                          >
                            {t('entities.editor.identity-template.service-name.action')}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          data-entity-editor-modeling-checklist-action="open-signals"
                          className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:text-[#eef4ff]"
                          onClick={() => {
                            setActiveStage('signals');
                            setDetailsExpanded(true);
                          }}
                        >
                          {t('entities.editor.modeling-checklist.action.signals')}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      {modelingChecklistRows.map(row => (
                        <div
                          key={row.key}
                          data-entity-editor-modeling-checklist-item={row.key}
                          data-entity-editor-modeling-checklist-state={row.state}
                          className="grid min-h-[72px] gap-1 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[12px] font-semibold text-[#f5f7fb]">{row.title}</span>
                            <span
                              className={cn(
                                'rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold',
                                row.state === 'ready'
                                  ? 'bg-[#161b2a] text-[#b8c7f4]'
                                  : row.state === 'next'
                                    ? 'bg-[#17213a] text-[#d8e4ff]'
                                    : 'bg-[#101217] text-[#98a2b3]'
                              )}
                            >
                              {t(`entities.editor.modeling-checklist.state.${row.state}`)}
                            </span>
                          </div>
                          <div className="text-[11px] leading-4 text-[#98a2b3]">{row.copy}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-[11px] font-semibold text-[#8d95a5]">{t('entities.editor.shell.stage-label')}</div>
                    <ol
                      data-entity-editor-stage-stepper="hertzbeat-ui-stepper"
                      data-entity-editor-edit-stage-posture={isCompleteContextStage ? 'hertzbeat-ui-complete-context' : undefined}
                      className="grid gap-3 md:grid-cols-4"
                    >
                      {editorStages.map((stage, index) => {
                        const active = activeStage === stage.key;
                        const done = coldStageRows.find(row => row.key === stage.key)?.done;
                        const helpId = `entity-editor-stage-help-${stage.key}`;
                        return (
                          <li
                            key={stage.key}
                            data-entity-editor-stage-step={stage.key}
                            data-entity-editor-stage-step-status={`${stage.key}-${done ? 'ready' : 'next'}`}
                            data-entity-editor-stage-step-active={active ? 'true' : 'false'}
                            data-entity-editor-stage-step-requirement={stage.requirementTone}
                            className="relative grid gap-2"
                          >
                            {index < editorStages.length - 1 ? (
                              <span
                                aria-hidden="true"
                                data-entity-editor-stage-step-connector="hertzbeat-ui-stepper-line"
                                className="absolute left-4 right-[-0.75rem] top-4 hidden h-px bg-[#2b3039] md:block"
                              />
                            ) : null}
                            <div
                              data-entity-editor-stage-step-row="hertzbeat-ui-stepper-row"
                              className={cn(
                                'relative z-[1] grid min-h-[64px] grid-cols-[32px_minmax(0,1fr)] items-start gap-2 py-1',
                                active ? 'text-[#f5f7fb]' : 'text-[#98a2b3]'
                              )}
                            >
                              <button
                                type="button"
                                aria-label={done ? t('entities.editor.stage.done-aria', { stage: stage.label }) : stage.label}
                                data-entity-editor-stage={stage.key}
                                data-entity-editor-stage-step-trigger="hertzbeat-ui-stepper-trigger"
                                className={cn(
                                  'inline-flex h-8 w-8 items-center justify-center rounded-full border text-[12px] font-semibold transition-colors',
                                  active
                                    ? 'border-[#4e74f8] bg-[#182238] text-[#f5f7fb]'
                                    : done
                                      ? 'border-[#31405c] bg-[#111724] text-[#d8e4ff]'
                                      : 'border-[#2b3039] bg-[#101217] text-[#8d95a5] hover:border-[#3b4454]'
                                )}
                                onClick={() => {
                                  setActiveStage(stage.key);
                                  setDetailsExpanded(true);
                                }}
                              >
                                {done ? (
                                  <Check
                                    aria-hidden="true"
                                    data-entity-editor-stage-step-done-icon="lucide-check"
                                    className="h-3.5 w-3.5 stroke-[2.4]"
                                  />
                                ) : (
                                  index + 1
                                )}
                              </button>
                              <div
                                aria-describedby={helpId}
                                data-entity-editor-stage-step-label="hertzbeat-ui-stepper-label"
                                className="grid gap-1 text-left"
                              >
                                <span className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    data-entity-editor-stage-step-title="hertzbeat-ui-stepper-title"
                                    className="text-left text-[12px] font-semibold text-[#f5f7fb] hover:text-[#d8e4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
                                    onClick={() => {
                                      setActiveStage(stage.key);
                                      setDetailsExpanded(true);
                                    }}
                                  >
                                    {stage.label}
                                  </button>
                                  <span
                                    data-entity-editor-stage-help-placement="inline-title"
                                    className="group relative inline-flex"
                                  >
                                    <button
                                      type="button"
                                      aria-label={t('entities.editor.stage.help-aria', { stage: stage.label })}
                                      aria-describedby={helpId}
                                      data-entity-editor-stage-help-trigger="hertzbeat-ui-stepper-help"
                                      data-entity-editor-stage-help-style="icon-after-title"
                                      data-entity-editor-stage-help-frame="borderless"
                                      data-entity-editor-stage-help-visual="circle-help-icon"
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-none bg-transparent text-[#8d95a5] transition hover:text-[#d8e4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
                                    >
                                      <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-entity-editor-stage-help-icon="lucide-circle-help" />
                                    </button>
                                    <span
                                      id={helpId}
                                      role="tooltip"
                                      data-entity-editor-stage-help="hertzbeat-ui-stepper-tooltip"
                                      className="pointer-events-none absolute left-0 top-6 z-20 hidden w-[260px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
                                    >
                                      <span className="block text-[11px] font-semibold text-[#f5f7fb]">{stage.requirementLabel}</span>
                                      <span className="mt-1 block text-[11px] leading-4 text-[#a8b0bf]">{stage.help}</span>
                                      <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{stage.impact}</span>
                                    </span>
                                  </span>
                                </span>
                                <span
                                  data-entity-editor-stage-step-requirement-label={stage.requirementTone}
                                  className={cn(
                                    'w-fit rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold',
                                    stage.requirementTone === 'required'
                                      ? 'bg-[#3b1d1d] text-[#ffb4b4]'
                                      : stage.requirementTone === 'recommended'
                                        ? 'bg-[#17213a] text-[#d8e4ff]'
                                        : 'bg-[#101217] text-[#98a2b3]'
                                  )}
                                >
                                  {stage.requirementLabel}
                                </span>
                                {active ? <span className="text-[10px] leading-[1.35] text-[#98a2b3]">{stage.description}</span> : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </div>

                {!previewRailCollapsed ? (
                  <aside
                    className="self-start p-0"
                    data-entity-editor-preview-rail="hertzbeat-ui-inline-preview"
                    data-entity-editor-preview-rail-density="hertzbeat-ui-inline-preview"
                    data-entity-editor-preview-rail-nesting-contract="flat-summary-aside"
                  >
                    <div className="text-[14px] font-semibold text-[#f5f7fb]">{t('entities.editor.shell.preview-rail.title')}</div>
                    <p className="mt-2 text-[13px] leading-5 text-[#98a2b3]">{t('entities.editor.shell.preview-rail.copy')}</p>
                  </aside>
                ) : null}
              </div>

            </div>

            <div
              data-entity-editor-definition-footer="hertzbeat-ui-definition-footer"
              className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-[#2b3039] pt-3"
            >
              <div>
                <div className="text-[12px] font-semibold text-[#dbe4f0]">{t('entities.editor.shell.definition-content.title')}</div>
                <div className="mt-1 text-[12px] leading-5 text-[#98a2b3]">{t('entities.editor.shell.definition-content.copy')}</div>
              </div>
              <div data-entity-editor-definition-tabs="hertzbeat-ui-bottom-tabs" className="inline-flex overflow-hidden rounded-[3px] border border-[#2b3039]">
                {definitionModeTabs.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    data-entity-editor-mode-trigger={value}
                    className={cn(
                      'inline-flex h-8 min-w-[70px] items-center justify-center border-l px-3 text-[14px] font-semibold first:border-l-0',
                      cn('border-[#2b3039]', editorSurfaceMode === value ? 'bg-[#182238] text-[#f5f7fb]' : 'bg-[#101217] text-[#98a2b3]')
                    )}
                    onClick={() => {
                      setEditorSurfaceMode(value as 'editor' | 'yaml' | 'json');
                      setDetailsExpanded(true);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section
            {...bodyDataAttrs}
            ref={stageBodyRef}
            data-entity-editor-route-stage-focus={routeStageFocusStage === activeStage ? activeStage : undefined}
            className={cn(
              'scroll-mt-24',
              detailsExpanded
                ? 'border-t border-[#2b3039] pt-4'
                : 'sr-only'
            )}
          >
            <div className="mb-4 border-b border-[#2b3039] pb-3">
              <div className="text-[14px] font-semibold text-[#f5f7fb]">{activeStageCopy.label}</div>
              <p className="mt-1 text-[12px] leading-5 text-[#98a2b3]">{activeStageCopy.description}</p>
            </div>

            {telemetryHandoff ? (
              <div
                data-entity-editor-telemetry-handoff="true"
                data-entity-editor-telemetry-handoff-source={telemetryHandoff.source}
                className="mb-4 grid gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <div className="text-[13px] font-semibold text-[#dbe4f0]">{telemetryHandoff.title}</div>
                    <div className="text-[12px] text-[#98a2b3]">{telemetryHandoff.copy}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
                    <span className="rounded-[3px] border border-[#31405c] bg-[#182238] px-2.5 py-1 text-[#d8e4ff]">
                      {telemetryHandoff.monitorCountLabel}
                    </span>
                    <span className="rounded-[3px] border border-[#2b3039] bg-[#0b0c0e] px-2.5 py-1 text-[#98a2b3]">
                      {telemetryHandoff.identityCountLabel}
                    </span>
                    <Link href={telemetryHandoff.discoveryHref} className="rounded-[3px] border border-[#31405c] bg-[#182238] px-2.5 py-1 text-[#d8e4ff]">
                      {telemetryHandoff.title}
                    </Link>
                  </div>
                </div>
                <div
                  data-entity-editor-attribution-panel="telemetry-attribution-check"
                  className="grid gap-2 border-t border-[#2b3039] pt-3"
                >
                  <div className="text-[12px] font-semibold text-[#dbe4f0]">{t('entities.editor.telemetry-handoff.attribution-check')}</div>
                  <div
                    data-entity-editor-attribution-grid="responsive-contained"
                    className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-5"
                  >
                    {attributionRows.map(row => (
                      <div
                        key={row.key}
                        data-entity-editor-attribution-row={row.key}
                        data-entity-editor-attribution-state={row.state}
                        className="grid min-h-[92px] min-w-0 gap-1 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-2"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-[12px] font-semibold text-[#f5f7fb]">{row.title}</div>
                          <span className={cn('rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold', attributionStateClassName(row.state))}>
                            {attributionStateLabel(row.state, t)}
                          </span>
                        </div>
                        <div className="min-w-0 truncate text-[12px] text-[#dbe4f0]">{row.copy}</div>
                        {row.href ? (
                          <Link href={row.href} className="block min-w-0 truncate text-[11px] font-semibold text-[#d8e4ff]">
                            {row.meta}
                          </Link>
                        ) : (
                          <div className="min-w-0 truncate text-[11px] leading-4 text-[#98a2b3]">{row.meta}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {editorSurfaceMode === 'editor' ? (
              <div data-entity-editor-mode="editor" className="grid gap-4">
                {activeStage === 'basic' ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      {renderField(t('entities.editor.field.display-name'), draft.entity.displayName || '', t('entities.editor.placeholder.display-name'), value => updateEntityField('displayName', value), 'display-name', {
                        help: t('entities.editor.field.display-name.help'),
                        impact: t('entities.editor.field.display-name.impact'),
                        requirement: 'optional'
                      })}
                      {renderField(t('entities.editor.field.namespace'), draft.entity.namespace || '', t('entities.editor.placeholder.namespace'), value => updateEntityField('namespace', value), 'namespace', {
                        help: t('entities.editor.field.namespace.help'),
                        impact: t('entities.editor.field.namespace.impact'),
                        suggestions: catalogSuggestions?.namespaces,
                        suggestionCapable: true,
                        requirement: 'recommended'
                      })}
                      {renderField(t('entities.editor.field.environment'), draft.entity.environment || '', t('entities.editor.placeholder.environment'), value => updateEntityField('environment', value), 'environment', {
                        help: t('entities.editor.field.environment.help'),
                        impact: t('entities.editor.field.environment.impact'),
                        suggestions: mergeSuggestions(catalogSuggestions?.environments, environmentSuggestions),
                        requirement: 'recommended'
                      })}
                      {renderField(t('entities.editor.field.subtype'), draft.entity.subtype || '', t('entities.editor.placeholder.subtype'), value => updateEntityField('subtype', value), 'subtype', {
                        help: t('entities.editor.field.subtype.help'),
                        impact: t('entities.editor.field.subtype.impact'),
                        suggestions: subtypeSuggestions,
                        requirement: 'optional'
                      })}
                      {renderField(t('entities.editor.field.owner'), draft.entity.owner || '', t('entities.editor.placeholder.owner'), value => updateEntityField('owner', value), 'owner', {
                        help: t('entities.editor.field.owner.help'),
                        impact: t('entities.editor.field.owner.impact'),
                        suggestions: catalogSuggestions?.owners,
                        suggestionCapable: true,
                        requirement: 'recommended'
                      })}
                      {renderField(t('entities.editor.field.system'), draft.entity.system || '', t('entities.editor.placeholder.system'), value => updateEntityField('system', value), 'system', {
                        help: t('entities.editor.field.system.help'),
                        impact: t('entities.editor.field.system.impact'),
                        suggestions: catalogSuggestions?.systems,
                        suggestionCapable: true,
                        requirement: 'recommended'
                      })}
                      {renderSelectField(t('entities.editor.field.source'), selectedEntrySource, value => updateEntityField('source', value), 'source', entrySources, {
                        help: t('entities.editor.field.source.help'),
                        impact: t('entities.editor.field.source.impact'),
                        requirement: 'required'
                      })}
                    </div>
                    <div className="grid gap-2">
                      <EntityEditorFieldTitle
                        label={t('entities.editor.field.description')}
                        fieldKey="description"
                        help={t('entities.editor.field.description.help')}
                        impact={t('entities.editor.field.description.impact')}
                        helpId="entity-editor-field-description-help"
                        helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.field.description') })}
                        inputMode="manual"
                        inputModeLabel={t('entities.editor.field.input-mode.manual')}
                        inputModeHelp={t('entities.editor.field.input-mode.manual.help')}
                        requirement="optional"
                        requirementLabel={fieldRequirementLabels.optional}
                      />
                      <Textarea
                        id="entity-editor-field-description"
                        aria-label={t('entities.editor.field.description')}
                        aria-describedby="entity-editor-field-description-help"
                        data-entity-editor-description-textarea="hertzbeat-ui-textarea"
                        className="min-h-[112px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] placeholder:text-[#6f7787] focus-visible:border-[#4e74f8]"
                        value={draft.entity.description || ''}
                        placeholder={t('entities.editor.field.description-placeholder')}
                        onChange={event => updateEntityField('description', event.target.value)}
                      />
                    </div>
                  </>
                ) : null}

                {activeStage === 'ownership' ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {renderField(t('entities.editor.field.owner'), draft.entity.owner || '', 'payments-team', value => updateEntityField('owner', value), 'owner', {
                      help: t('entities.editor.field.owner.help'),
                      impact: t('entities.editor.field.owner.impact'),
                      suggestions: catalogSuggestions?.owners,
                      suggestionCapable: true,
                      requirement: 'recommended'
                    })}
                    {renderField(t('entities.editor.field.runbook'), draft.entity.runbook || '', 'https://runbook.internal/...', value => updateEntityField('runbook', value), 'runbook', {
                      help: t('entities.editor.field.runbook.help'),
                      impact: t('entities.editor.field.runbook.impact'),
                      requirement: 'optional'
                    })}
                    {renderField(t('entities.editor.field.system'), draft.entity.system || '', t('entities.editor.placeholder.system'), value => updateEntityField('system', value), 'system', {
                      help: t('entities.editor.field.system.help'),
                      impact: t('entities.editor.field.system.impact'),
                      suggestions: catalogSuggestions?.systems,
                      suggestionCapable: true,
                      requirement: 'recommended'
                    })}
                    {renderField(t('entities.editor.field.environment'), draft.entity.environment || '', t('entities.editor.placeholder.environment'), value => updateEntityField('environment', value), 'environment', {
                      help: t('entities.editor.field.environment.help'),
                      impact: t('entities.editor.field.environment.impact'),
                      suggestions: mergeSuggestions(catalogSuggestions?.environments, environmentSuggestions),
                      requirement: 'recommended'
                    })}
                    <ContactEditor
                      value={contacts}
                      onChange={setContacts}
                      title={t('entities.editor.contact.title')}
                      addLabel={t('entities.editor.contact.add')}
                      deleteLabel={t('common.remove')}
                      namePlaceholder={t('entities.editor.contact.name-placeholder')}
                      typePlaceholder={t('entities.editor.contact.type-placeholder')}
                      valuePlaceholder={t('entities.editor.contact.value-placeholder')}
                      contactPlaceholder={t('entities.editor.contact.contact-placeholder')}
                      help={t('entities.editor.contact.help')}
                      impact={t('entities.editor.contact.impact')}
                      inputModeLabel={manualInputModeLabel}
                      inputModeHelp={manualInputModeHelp}
                      helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.contact.title') })}
                      requirement="optional"
                      requirementLabel={fieldRequirementLabels.optional}
                    />
                    <LinkEditor
                      value={links}
                      onChange={setLinks}
                      title={t('entities.editor.link.title')}
                      addLabel={t('entities.editor.link.add')}
                      deleteLabel={t('common.remove')}
                      namePlaceholder={t('entities.editor.link.name-placeholder')}
                      typePlaceholder={t('entities.editor.link.type-placeholder')}
                      providerPlaceholder={t('entities.editor.link.provider-placeholder')}
                      urlPlaceholder={t('entities.editor.link.url-placeholder')}
                      help={t('entities.editor.link.help')}
                      impact={t('entities.editor.link.impact')}
                      inputModeLabel={manualInputModeLabel}
                      inputModeHelp={manualInputModeHelp}
                      helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.link.title') })}
                      requirement="optional"
                      requirementLabel={fieldRequirementLabels.optional}
                    />
                  </div>
                ) : null}

                {activeStage === 'signals' ? (
                  <div className="grid gap-3">
                    <div
                      data-entity-editor-identity-template="service-name"
                      className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-[#eef2f7]">{t('entities.editor.identity-template.service-name.title')}</div>
                          <p className="mt-1 text-[11px] leading-5 text-[#98a2b3]">{t('entities.editor.identity-template.service-name.copy')}</p>
                        </div>
                        <Button
                          type="button"
                          variant="default"
                          data-entity-editor-identity-template-action="service-name"
                          className="h-8 rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#202a42] disabled:cursor-not-allowed disabled:border-[#2b3039] disabled:bg-[#101217] disabled:text-[#6f7787]"
                          disabled={serviceIdentityTemplateDisabled}
                          onClick={applyServiceIdentityTemplate}
                        >
                          {t('entities.editor.identity-template.service-name.action')}
                        </Button>
                      </div>
                      <div className="rounded-[3px] border border-[#252b34] bg-[#0b0c0e] px-2 py-1 font-mono text-[11px] leading-5 text-[#a8b0bf]">
                        {serviceIdentityTemplateDisabled
                          ? t('entities.editor.identity-template.service-name.needs-name')
                          : t('entities.editor.identity-template.service-name.preview', { name: draft.entity.name || '' })}
                      </div>
                    </div>
                    <JsonObjectListEditor label={t('entities.editor.collection.identities')} value={identitiesItems} addCopy={t('entities.editor.collection.identities.add')} onChange={setIdentitiesItems} itemLabel={t('common.item')} deleteLabel={t('common.remove')} help={t('entities.editor.collection.identities.help')} impact={t('entities.editor.collection.identities.impact')} inputModeLabel={manualInputModeLabel} inputModeHelp={manualInputModeHelp} helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.collection.identities') })} requirement="recommended" requirementLabel={fieldRequirementLabels.recommended} overflowCopy={(hidden, total, rendered) => t('entities.editor.collection.json-list.overflow', { hidden, total, rendered })} showAllCopy={t('entities.editor.collection.json-list.show-all')} />
                    <div
                      data-entity-editor-monitor-bind-template="manual-monitor-id"
                      className="grid gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 py-3"
                    >
                      {incomingMonitorNeedsBinding && incomingMonitorContext ? (
                        <div
                          data-entity-editor-incoming-monitor-context="true"
                          data-entity-editor-incoming-monitor-context-id={incomingMonitorContext.monitorId}
                          data-entity-editor-incoming-monitor-preflight={incomingMonitorPreflightState}
                          data-entity-editor-incoming-monitor-conflict={incomingMonitorConflict != null ? 'true' : 'false'}
                          className="grid gap-1 rounded-[3px] border border-[#31405c] bg-[#182238] px-3 py-2"
                        >
                          <div className="text-[12px] font-semibold text-[#f5f7fb]">
                            {t('entities.editor.monitor-bind-template.incoming.title')}
                          </div>
                          <p className="text-[11px] leading-5 text-[#b8c7e6]">
                            {t('entities.editor.monitor-bind-template.incoming.copy', {
                              name: incomingMonitorContext.label
                            })}
                          </p>
                          <div className="font-mono text-[11px] leading-5 text-[#d8e4ff]">
                            {t('entities.editor.monitor-bind-template.incoming.meta', {
                              monitorId: incomingMonitorContext.monitorId,
                              meta: incomingMonitorContext.meta
                            })}
                          </div>
                          {incomingMonitorPreflightState === 'loading' ? (
                            <div className="text-[11px] leading-5 text-[#d8e4ff]">
                              {t('entities.editor.monitor-bind-template.incoming.preflight-loading')}
                            </div>
                          ) : null}
                          {incomingMonitorPreflightState === 'failed' ? (
                            <div className="text-[11px] leading-5 text-[#ffd5da]">
                              {t('entities.editor.monitor-bind-template.incoming.preflight-failed')}
                            </div>
                          ) : null}
                          {incomingMonitorConflict ? (
                            <div className="grid gap-1 rounded-[3px] border border-[#5b2c32] bg-[#211114] px-2 py-2 text-[11px] leading-5 text-[#f0a7af]">
                              <span>
                                {t('entities.editor.monitor-bind-template.incoming.preflight-conflict', {
                                  entity: incomingMonitorConflict.entityName || String(incomingMonitorConflict.entityId)
                                })}
                              </span>
                              {incomingMonitorConflictHref ? (
                                <Link
                                  href={incomingMonitorConflictHref}
                                  data-entity-editor-incoming-monitor-conflict-link="true"
                                  className="w-fit rounded-[3px] border border-[#5b2c32] bg-[#2b151a] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffd5da] hover:border-[#f0a7af]"
                                >
                                  {t('entities.editor.message.monitor-bind-conflict.open-existing')}
                                </Link>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-[#eef2f7]">{t('entities.editor.monitor-bind-template.manual-monitor.title')}</div>
                          <p className="mt-1 text-[11px] leading-5 text-[#98a2b3]">{t('entities.editor.monitor-bind-template.manual-monitor.copy')}</p>
                        </div>
                        <Button
                          type="button"
                          variant="default"
                          data-entity-editor-monitor-bind-template-action="manual-monitor-id"
                          className="h-8 rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#202a42] disabled:cursor-not-allowed disabled:border-[#2b3039] disabled:bg-[#101217] disabled:text-[#6f7787]"
                          disabled={monitorBindTemplateDisabled}
                          onClick={applyMonitorBindTemplate}
                        >
                          {t('entities.editor.monitor-bind-template.manual-monitor.action')}
                        </Button>
                      </div>
                      <EntityEditorFieldTitle
                        label={t('entities.editor.monitor-bind-template.search.label')}
                        fieldKey="monitor-bind-template-search"
                        help={t('entities.editor.monitor-bind-template.search.help')}
                        impact={t('entities.editor.monitor-bind-template.search.impact')}
                        inputMode="suggestions"
                        inputModeLabel={t('entities.editor.field.input-mode.suggestions')}
                        inputModeHelp={t('entities.editor.field.input-mode.suggestions.help')}
                        requirement="recommended"
                        requirementLabel={fieldRequirementLabels.recommended}
                      />
                      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                        <Input
                          data-entity-editor-monitor-bind-search-input="true"
                          className={coldInputClassName}
                          value={monitorBindSearch}
                          onChange={event => setMonitorBindSearch(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void searchMonitorBindCandidates();
                            }
                          }}
                          placeholder={t('entities.editor.monitor-bind-template.search.placeholder')}
                        />
                        <Button
                          type="button"
                          variant="subtle"
                          data-entity-editor-monitor-bind-search-action="true"
                          disabled={monitorBindSearchLoading}
                          onClick={() => void searchMonitorBindCandidates()}
                        >
                          {monitorBindSearchLoading && !monitorBindSearchLoadingMore
                            ? t('common.loading')
                            : t('entities.editor.monitor-bind-template.search.action')}
                        </Button>
                      </div>
                      {monitorBindSearchMessage ? (
                        <div
                          role="status"
                          aria-live="polite"
                          data-entity-editor-monitor-bind-search-feedback="true"
                          className="text-[11px] leading-5 text-[#98a2b3]"
                        >
                          {monitorBindSearchMessage}
                        </div>
                      ) : null}
                      {monitorBindCandidates.length > 0 ? (
                        <div
                          data-entity-editor-monitor-bind-candidates="true"
                          data-entity-editor-monitor-bind-candidate-total={monitorBindSearchTotal}
                          className="grid gap-2"
                        >
                          {monitorBindCandidates.map(candidate => {
                            const conflict = monitorBindCandidateConflicts[String(candidate.id)];
                            const conflictHref = buildEntityEditorMonitorBindConflictHref(conflict, entityReturnHref);
                            if (conflict != null) {
                              return (
                                <div
                                  key={candidate.id}
                                  data-entity-editor-monitor-bind-candidate={candidate.id}
                                  data-entity-editor-monitor-bind-candidate-conflict="true"
                                  className="grid min-w-0 gap-1 rounded-[3px] border border-[#5b2c32] bg-[#211114] px-3 py-2 text-left text-[#f0a7af]"
                                >
                                  <span className="truncate text-[12px] font-semibold text-[#eef2f7]">{candidate.name || candidate.id}</span>
                                  <span className="truncate text-[11px] text-[#98a2b3]">
                                    {t('entities.editor.monitor-bind-template.search.candidate-meta', {
                                      id: candidate.id,
                                      app: candidate.app || t('common.none'),
                                      instance: candidate.instance || t('common.none')
                                    })}
                                  </span>
                                  <span className="text-[11px] leading-5 text-[#f0a7af]">
                                    {t('entities.editor.monitor-bind-template.search.already-bound', {
                                      entity: conflict.entityName || String(conflict.entityId)
                                    })}
                                  </span>
                                  {conflictHref ? (
                                    <Link
                                      href={conflictHref}
                                      data-entity-editor-monitor-bind-candidate-conflict-link="true"
                                      className="w-fit rounded-[3px] border border-[#5b2c32] bg-[#2b151a] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffd5da] hover:border-[#f0a7af]"
                                    >
                                      {t('entities.editor.message.monitor-bind-conflict.open-existing')}
                                    </Link>
                                  ) : null}
                                </div>
                              );
                            }
                            const candidateIsSelected = String(candidate.id) === normalizedMonitorBindTemplateId
                              && monitorBindItemsContainMonitor(monitorBindItems, String(candidate.id));
                            return (
                            <button
                              key={candidate.id}
                              type="button"
                              data-entity-editor-monitor-bind-candidate={candidate.id}
                              data-entity-editor-monitor-bind-candidate-conflict="false"
                              data-entity-editor-monitor-bind-candidate-selected={candidateIsSelected ? 'true' : 'false'}
                              aria-pressed={candidateIsSelected}
                              onClick={() => applyMonitorBindCandidate(candidate)}
                              className={cn(
                                'grid min-w-0 gap-1 rounded-[3px] border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]',
                                candidateIsSelected
                                  ? 'border-[#4e74f8] bg-[#151923]'
                                  : 'border-[#2b3039] bg-[#0b0c0e] hover:border-[#4e74f8] hover:bg-[#151923]'
                              )}
                            >
                              <span className="flex min-w-0 items-center justify-between gap-2">
                                <span className="truncate text-[12px] font-semibold text-[#eef2f7]">{candidate.name || candidate.id}</span>
                                {candidateIsSelected ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#9bb2ff]">
                                    <Check aria-hidden="true" className="h-3 w-3" />
                                    {t('entities.editor.monitor-bind-template.search.selected-label')}
                                  </span>
                                ) : null}
                              </span>
                              <span className="truncate text-[11px] text-[#98a2b3]">
                                {t('entities.editor.monitor-bind-template.search.candidate-meta', {
                                  id: candidate.id,
                                  app: candidate.app || t('common.none'),
                                  instance: candidate.instance || t('common.none')
                                })}
                              </span>
                            </button>
                            );
                          })}
                          {monitorBindCandidates.length < monitorBindSearchTotal ? (
                            <Button
                              type="button"
                              variant="subtle"
                              data-entity-editor-monitor-bind-load-more="true"
                              disabled={monitorBindSearchLoading}
                              onClick={() => void loadMoreMonitorBindCandidates()}
                              className="justify-self-start"
                            >
                              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                              {monitorBindSearchLoadingMore
                                ? t('common.loading')
                                : t('entities.editor.monitor-bind-template.search.load-more', {
                                  visible: Math.min(
                                    monitorBindSearchTotal,
                                    monitorBindCandidates.length + ENTITY_EDITOR_MONITOR_BIND_SEARCH_PAGE_SIZE
                                  ),
                                  total: monitorBindSearchTotal
                                })}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                      <EntityEditorFieldTitle
                        label={t('entities.editor.monitor-bind-template.manual-monitor.target')}
                        fieldKey="monitor-bind-template-monitor-id"
                        help={t('entities.editor.monitor-bind-template.manual-monitor.target.help')}
                        impact={t('entities.editor.monitor-bind-template.manual-monitor.target.impact')}
                        inputMode="manual"
                        inputModeLabel={manualInputModeLabel}
                        inputModeHelp={manualInputModeHelp}
                        requirement="recommended"
                        requirementLabel={fieldRequirementLabels.recommended}
                      />
                      <Input
                        data-entity-editor-monitor-bind-template-input="manual-monitor-id"
                        className={coldInputClassName}
                        value={monitorBindTemplateId}
                        onChange={event => setMonitorBindTemplateId(event.target.value)}
                        placeholder={t('entities.editor.monitor-bind-template.manual-monitor.placeholder')}
                      />
                      <div className="rounded-[3px] border border-[#252b34] bg-[#0b0c0e] px-2 py-1 font-mono text-[11px] leading-5 text-[#a8b0bf]">
                        {monitorBindTemplatePreviewCopy}
                      </div>
                    </div>
                    <JsonObjectListEditor label={t('entities.editor.collection.monitor-binds')} value={monitorBindItems} addCopy={t('entities.editor.collection.monitor-binds.add')} emptyCopy={t('entities.editor.collection.monitor-binds.empty')} onChange={setMonitorBindItems} itemLabel={t('common.item')} deleteLabel={t('common.remove')} help={t('entities.editor.collection.monitor-binds.help')} impact={t('entities.editor.collection.monitor-binds.impact')} inputModeLabel={manualInputModeLabel} inputModeHelp={manualInputModeHelp} helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.collection.monitor-binds') })} requirement="recommended" requirementLabel={fieldRequirementLabels.recommended} overflowCopy={(hidden, total, rendered) => t('entities.editor.collection.json-list.overflow', { hidden, total, rendered })} showAllCopy={t('entities.editor.collection.json-list.show-all')} />
                    {monitorBindingDraftedForTemplate ? (
                      <div
                        data-entity-editor-monitor-bind-next-step="save-entity"
                        className="rounded-[3px] border border-[#31405c] bg-[#111724] px-3 py-2 text-[11px] leading-5 text-[#d8e4ff]"
                      >
                        {t('entities.editor.monitor-bind-template.manual-monitor.generated-next-step', {
                          monitorId: normalizedMonitorBindTemplateId
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeStage === 'relations' ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div
                      data-entity-editor-relation-template="depends-on"
                      className="grid gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 py-3 md:col-span-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-[#eef2f7]">{t('entities.editor.relation-template.depends-on.title')}</div>
                          <p className="mt-1 text-[11px] leading-5 text-[#98a2b3]">{t('entities.editor.relation-template.depends-on.copy')}</p>
                        </div>
                        <Button
                          type="button"
                          variant="default"
                          data-entity-editor-relation-template-action="depends-on"
                          className="h-8 rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#202a42] disabled:cursor-not-allowed disabled:border-[#2b3039] disabled:bg-[#101217] disabled:text-[#6f7787]"
                          disabled={dependencyRelationTemplateDisabled}
                          onClick={applyDependencyRelationTemplate}
                        >
                          {t('entities.editor.relation-template.depends-on.action')}
                        </Button>
                      </div>
                      {renderField(
                        t('entities.editor.relation-template.depends-on.target'),
                        relationTargetRef,
                        t('entities.editor.relation-template.depends-on.placeholder'),
                        setRelationTargetRef,
                        'relation-target',
                        {
                          suggestions: catalogSuggestions?.entityRefs,
                          suggestionCapable: true,
                          inputMode: (catalogSuggestions?.entityRefs || []).length > 0 ? 'suggestions' : 'catalog',
                          help: t('entities.editor.relation-template.depends-on.target.help'),
                          impact: t('entities.editor.relation-template.depends-on.target.impact'),
                          requirement: 'optional'
                        }
                      )}
                      <div className="rounded-[3px] border border-[#252b34] bg-[#0b0c0e] px-2 py-1 font-mono text-[11px] leading-5 text-[#a8b0bf]">
                        {dependencyRelationTemplateDisabled
                          ? t('entities.editor.relation-template.depends-on.needs-target')
                          : t('entities.editor.relation-template.depends-on.preview', { target: normalizedRelationTargetRef })}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <JsonObjectListEditor label={t('entities.editor.collection.relations')} value={relationItems} addCopy={t('entities.editor.collection.relations.add')} onChange={setRelationItems} itemLabel={t('common.item')} deleteLabel={t('common.remove')} help={t('entities.editor.collection.relations.help')} impact={t('entities.editor.collection.relations.impact')} inputModeLabel={manualInputModeLabel} inputModeHelp={manualInputModeHelp} helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.collection.relations') })} requirement="optional" requirementLabel={fieldRequirementLabels.optional} overflowCopy={(hidden, total, rendered) => t('entities.editor.collection.json-list.overflow', { hidden, total, rendered })} showAllCopy={t('entities.editor.collection.json-list.show-all')} />
                    </div>
                    <MultiValueField label={t('entities.editor.relation.component-of')} value={componentOfText} placeholder={t('entities.editor.relation.component-of-placeholder')} onChange={setComponentOfText} help={t('entities.editor.relation.component-of.help')} impact={t('entities.editor.relation.component-of.impact')} inputModeLabel={manualInputModeLabel} inputModeHelp={manualInputModeHelp} helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.relation.component-of') })} requirement="optional" requirementLabel={fieldRequirementLabels.optional} />
                    <MultiValueField label={t('entities.editor.relation.components')} value={componentsText} placeholder={t('entities.editor.relation.components-placeholder')} onChange={setComponentsText} help={t('entities.editor.relation.components.help')} impact={t('entities.editor.relation.components.impact')} inputModeLabel={manualInputModeLabel} inputModeHelp={manualInputModeHelp} helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.relation.components') })} requirement="optional" requirementLabel={fieldRequirementLabels.optional} />
                    <MultiValueField label={t('entities.editor.relation.implemented-by')} value={implementedByText} placeholder={t('entities.editor.relation.implemented-by-placeholder')} onChange={setImplementedByText} help={t('entities.editor.relation.implemented-by.help')} impact={t('entities.editor.relation.implemented-by.impact')} inputModeLabel={manualInputModeLabel} inputModeHelp={manualInputModeHelp} helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.relation.implemented-by') })} requirement="optional" requirementLabel={fieldRequirementLabels.optional} />
                    <MultiValueField label={t('entities.editor.relation.languages')} value={languagesText} placeholder={t('entities.editor.relation.languages-placeholder')} onChange={setLanguagesText} help={t('entities.editor.relation.languages.help')} impact={t('entities.editor.relation.languages.impact')} inputModeLabel={manualInputModeLabel} inputModeHelp={manualInputModeHelp} helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.relation.languages') })} requirement="optional" requirementLabel={fieldRequirementLabels.optional} />
                    <KeyValueEditor label={t('entities.editor.relation.labels')} rows={labelRows} onChange={setLabelRows} keyPlaceholder={t('entities.editor.relation.label-key')} valuePlaceholder={t('entities.editor.relation.label-value')} deleteLabel={t('common.remove')} addLabel={t('entities.editor.relation.label-add')} help={t('entities.editor.relation.labels.help')} impact={t('entities.editor.relation.labels.impact')} inputModeLabel={manualInputModeLabel} inputModeHelp={manualInputModeHelp} helpLabel={t('entities.editor.field.help-aria', { field: t('entities.editor.relation.labels') })} requirement="optional" requirementLabel={fieldRequirementLabels.optional} />
                  </div>
                ) : null}
              </div>
            ) : (
              <div data-entity-editor-mode={editorSurfaceMode} className="grid gap-3">
                <HzCodeEditor
                  readOnly
                  data-entity-editor-definition-preview={editorSurfaceMode}
                  data-entity-editor-definition-code-editor="preview"
                  language={editorSurfaceMode === 'yaml' ? 'yaml' : 'json'}
                  minHeight="280px"
                  ariaLabel={editorSurfaceMode === 'yaml' ? t('entities.editor.definition.aria.yaml') : t('entities.editor.definition.aria.json')}
                  value={definitionPreview}
                />
              </div>
            )}
          </section>

          {visibleMessage ? (
            <div
              role={messageTone === 'error' ? 'alert' : 'status'}
              data-entity-editor-message={messageTone === 'error' ? 'error' : 'status'}
              className={cn('flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em]', messageTone === 'success' ? 'text-[#9fb0cc]' : 'text-rose-600')}
            >
              <span>{visibleMessage}</span>
              {duplicateRecoveryHref ? (
                <Link
                  href={duplicateRecoveryHref}
                  data-entity-editor-duplicate-recovery-link="true"
                  className="rounded-[3px] border border-[#31405c] bg-[#182238] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#202a42]"
                >
                  {t('entities.editor.message.duplicate-recovery.open-existing')}
                </Link>
              ) : null}
              {monitorBindConflictRecoveryHref ? (
                <Link
                  href={monitorBindConflictRecoveryHref}
                  data-entity-editor-monitor-bind-conflict-recovery-link="true"
                  className="rounded-[3px] border border-[#31405c] bg-[#182238] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#202a42]"
                >
                  {t('entities.editor.message.monitor-bind-conflict.open-existing')}
                </Link>
              ) : null}
              {showBackendRetry ? (
                <button
                  type="submit"
                  data-entity-editor-backend-unavailable-retry="save-again"
                  disabled={saving}
                  className="rounded-[3px] border border-[#31405c] bg-[#182238] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#202a42] disabled:cursor-not-allowed disabled:border-[#2b3039] disabled:bg-[#101217] disabled:text-[#6f7787]"
                >
                  {t('common.button.retry')}
                </button>
              ) : null}
            </div>
          ) : null}

          <div
            data-entity-editor-footer="true"
            className={cn(
              detailsExpanded
                ? 'flex flex-wrap items-center justify-end gap-2 border-t border-[#2b3039] pt-3'
                : 'sr-only'
            )}
          >
            <EntityEditorActionWithHelp
              helpId="cancel"
              helpLabel={t('entities.editor.action.cancel.help-label')}
              helpCopy={cancelHelpCopy}
            >
                <Link
                  href={entityReturnHref}
                  data-entity-editor-command-action="footer-cancel"
                  data-entity-editor-cancel-return={entityReturnContract}
                  data-entity-editor-cancel-return-target={entityReturnHref}
                  data-entity-editor-unsaved-return-guard={hasUnsavedChanges ? 'dirty' : 'clean'}
                className={buttonVariants({ variant: 'subtle', size: 'sm' })}
                onClick={requestEditorReturn}
              >
                {t('common.cancel')}
              </Link>
            </EntityEditorActionWithHelp>
            <EntityEditorActionWithHelp
              helpId="save"
              helpLabel={t('entities.editor.action.save.help-label')}
              helpCopy={t(mode === 'new' ? 'entities.editor.action.save.create-help' : 'entities.editor.action.save.edit-help')}
            >
              <Button
                type="submit"
                size="sm"
                variant="primary"
                aria-label={footerSubmitLabel}
                disabled={saveDisabled}
                data-entity-editor-command-action="footer-submit"
                data-entity-editor-submit-placement="footer"
                data-entity-editor-submit-blocked-by-monitor-conflict={saveBlockedByIncomingMonitorConflict ? 'true' : undefined}
                data-entity-editor-submit-waiting-for-monitor-preflight={saveBlockedByIncomingMonitorPreflight ? 'true' : undefined}
              >
                {saving ? t('common.saving') : submitLabel}
              </Button>
            </EntityEditorActionWithHelp>
          </div>
          <div
            data-entity-editor-unsaved-cancel="hertzbeat-ui-confirm-dialog"
            data-entity-editor-unsaved-cancel-state={discardDialogOpen ? 'open' : 'closed'}
          >
            <HzConfirmDialog
              open={discardDialogOpen}
              tone="warning"
              title={t('entities.editor.unsaved-cancel.title')}
              kicker={t('entities.editor.unsaved-cancel.kicker')}
              cancelLabel={t('entities.editor.unsaved-cancel.keep-editing')}
              confirmLabel={t('entities.editor.unsaved-cancel.discard')}
              onClose={() => setDiscardDialogOpen(false)}
              onConfirm={confirmDiscardAndReturn}
              data-entity-editor-unsaved-cancel-dialog="hertzbeat-ui-confirm-dialog"
              cancelButtonProps={
                {
                  type: 'button',
                  'data-entity-editor-unsaved-cancel-keep-editing': 'true'
                } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']
              }
              confirmButtonProps={
                {
                  type: 'button',
                  'data-entity-editor-unsaved-cancel-confirm': 'true'
                } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']
              }
            >
              <p data-entity-editor-unsaved-cancel-copy="true">
                {t('entities.editor.unsaved-cancel.copy')}
              </p>
            </HzConfirmDialog>
          </div>
        </div>
      </form>
    );
  }

  return null;
}
