'use client';

import React from 'react';
import Link from 'next/link';
import {
  Boxes,
  Braces,
  Cable,
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
import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '@/components/providers/i18n-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ColdCodeEditor } from '../ui/cold-code-editor';
import { WorkbenchInsetPanel } from '@/components/workbench/primitives';
import { apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { addJsonRow, addObjectRow, ensureJsonRows, ensureObjectRows, removeJsonRow, removeObjectArrayItem, updateJsonRow, updateObjectArrayItem } from '@/lib/entity-editor/collection-state';
import { buildEntityPayload, saveEntityPayload } from '@/lib/entity-editor/controller';
import type { KeyValueDraft } from '@/lib/entity-editor/draft-utils';
import { ensureKeyValueRows, removeRowAt, updateRowAt } from '@/lib/entity-editor/editor-state';
import { buildEntityEditorFormState } from '@/lib/entity-editor/initial-state';
import { buildEntityEditorAttributionRows } from '@/lib/entity-editor/view-model';
import type {
  EntityCatalogSuggestions,
  EntityContactRef,
  EntityDto,
  EntityLinkRef,
  EntityOwnerRef
} from '@/lib/types';
import { cn } from '@/lib/utils';

const fieldLabelClassName = 'text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ops-text-tertiary)]';
const shellPanelLayoutClassName = 'grid gap-2.5';

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

function hasNonEmptyText(value?: string | null) {
  return value != null && value.trim() !== '';
}

function hasAnyStructuredValue(item: object) {
  return Object.values(item as Record<string, unknown>).some(value => {
    if (typeof value === 'string') {
      return value.trim() !== '';
    }
    return Boolean(value);
  });
}

function attributionStateLabel(state: string) {
  if (state === 'ready') {
    return '已就绪';
  }
  if (state === 'missing') {
    return '需补齐';
  }
  return '待确认';
}

function attributionStateClassName(state: string) {
  if (state === 'ready') {
    return 'border-[#24533a] bg-[#101914] text-[#a8efc0]';
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

function MultiValueField({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className={fieldLabelClassName}>{label}</span>
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
  addLabel
}: {
  label: string;
  rows: KeyValueDraft[];
  onChange: (rows: KeyValueDraft[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  deleteLabel: string;
  addLabel: string;
}) {
  const nextRows = ensureKeyValueRows(rows);
  return (
    <div className="grid gap-3">
      <div className={fieldLabelClassName}>{label}</div>
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
  typePlaceholder
}: {
  value: EntityOwnerRef[];
  onChange: (value: EntityOwnerRef[]) => void;
  title: string;
  addLabel: string;
  deleteLabel: string;
  namePlaceholder: string;
  typePlaceholder: string;
}) {
  const rows = ensureObjectRows(value);
  return (
    <div className="grid gap-3">
      <div className={fieldLabelClassName}>{title}</div>
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
  urlPlaceholder
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
}) {
  const rows = ensureObjectRows(value);
  return (
    <div className="grid gap-3">
      <div className={fieldLabelClassName}>{title}</div>
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
  contactPlaceholder
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
}) {
  const rows = ensureObjectRows(value);
  return (
    <div className="grid gap-3">
      <div className={fieldLabelClassName}>{title}</div>
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
  onChange,
  itemLabel,
  deleteLabel
}: {
  label: string;
  value: string[];
  addCopy: string;
  onChange: (value: string[]) => void;
  itemLabel: string;
  deleteLabel: string;
}) {
  const rows = ensureJsonRows(value);
  return (
    <div className="grid gap-3">
      <div className={fieldLabelClassName}>{label}</div>
      {rows.map((item, index) => (
        <WorkbenchInsetPanel key={`${label}-${index}`} className={shellPanelLayoutClassName}>
          <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
            <div className="text-sm leading-6 text-[var(--ops-text-secondary)]">
              {itemLabel} {index + 1}
            </div>
            <Button type="button" variant="subtle" onClick={() => onChange(removeJsonRow(rows, index))}>
              {deleteLabel}
            </Button>
          </div>
          <ColdCodeEditor
            data-entity-editor-json-code-editor="object-row"
            value={item}
            language="json"
            minHeight="132px"
            ariaLabel={`${label} ${index + 1}`}
            onChange={nextValue => onChange(updateJsonRow(rows, index, nextValue))}
          />
        </WorkbenchInsetPanel>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="subtle" onClick={() => onChange(addJsonRow(rows))}>
          {addCopy}
        </Button>
      </div>
    </div>
  );
}

export function EntityEditorSurface({
  initial,
  mode,
  entityId
}: {
  initial: EntityDto;
  mode: 'new' | 'edit';
  entityId?: string;
  catalogSuggestions?: EntityCatalogSuggestions;
}) {
  const { t } = useI18n();

  const tr = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  }, [t]);

  const initialFormState = buildEntityEditorFormState(initial);
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
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorSurfaceMode, setEditorSurfaceMode] = useState<'editor' | 'yaml' | 'json'>('editor');
  const [previewRailCollapsed, setPreviewRailCollapsed] = useState(false);
  const [activeStage, setActiveStage] = useState<EntityEditorStageKey>('basic');
  const [detailsExpanded, setDetailsExpanded] = useState(false);

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

    if (!isTelemetryDraft && monitorBinds.length === 0 && identities.length === 0) {
      return null;
    }

    const primaryMonitorId = monitorBinds.find(item => typeof item === 'object' && item != null && 'monitorId' in (item as Record<string, unknown>));
    const resolvedMonitorId =
      primaryMonitorId && typeof primaryMonitorId === 'object'
        ? (primaryMonitorId as { monitorId?: string | number }).monitorId
        : undefined;

    return {
      title: tr('entity.entry-source.telemetry', '遥测发现'),
      copy: tr(
        'entity.entry-source.telemetry.desc',
        '先通过监控和 OTel 资源字段识别实体，再补充基础信息。'
      ),
      monitorCount: monitorBinds.length,
      identityCount: identities.length,
      discoveryHref:
        resolvedMonitorId != null
          ? `/entities/discovery?source=telemetry&monitorId=${encodeURIComponent(String(resolvedMonitorId))}`
          : '/entities/discovery'
    };
  }, [previewPayload, tr]);

  const attributionRows = useMemo(() => buildEntityEditorAttributionRows(previewPayload), [previewPayload]);

  const stageRows = useMemo<EntityEditorStageRow[]>(
    () => [
      {
        key: 'basic',
        title: tr('entity.guide.profile', '基本信息'),
        description: tr('entity.guide.profile.desc', '选择实体类型，并填写稳定的实体名称。'),
        done: hasNonEmptyText(draft.entity.type) && hasNonEmptyText(draft.entity.name)
      },
      {
        key: 'ownership',
        title: tr('entity.guide.owner', '归属处置'),
        description: tr('entity.guide.owner.desc', '补齐负责人或运行手册，让值班人员知道下一步动作。'),
        done:
          hasNonEmptyText(draft.entity.owner) ||
          hasNonEmptyText(draft.entity.runbook) ||
          owners.some(owner => hasAnyStructuredValue(owner)) ||
          contacts.some(contact => hasAnyStructuredValue(contact)) ||
          links.some(link => hasAnyStructuredValue(link))
      },
      {
        key: 'signals',
        title: tr('entity.guide.evidence', '证据关联'),
        description: tr('entity.guide.evidence.desc', '关联监控和身份标识，让告警与日志可以汇聚到该实体。'),
        done: (previewPayload.identities?.length || 0) > 0 || (previewPayload.monitorBinds?.length || 0) > 0
      },
      {
        key: 'relations',
        title: tr('entity.guide.context', '关系上下文'),
        description: tr('entity.guide.context.desc', '补充拓扑、备注和标签，让故障复盘更容易阅读。'),
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
    [componentOfText, componentsText, contacts, draft.entity.criticality, draft.entity.inheritFrom, draft.entity.name, draft.entity.owner, draft.entity.runbook, draft.entity.type, implementedByText, labelRows, languagesText, links, owners, previewPayload.identities, previewPayload.monitorBinds, previewPayload.relations, tagsText, tr]
  );

  const isCompleteContextStage = mode === 'edit' && Boolean(entityId);
  const coldStageRows = isCompleteContextStage
    ? stageRows.map(stage => (stage.key === 'relations' ? { ...stage, done: true } : stage))
    : stageRows;

  async function save() {
    setSaving(true);
    setMessage(null);
    setMessageTone(null);
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
          monitorBindItems,
          relationItems
        },
        (label, index) =>
          t('entities.editor.json.invalid', {
            label,
            index
          })
      );

      if (mode === 'new') {
        setMessage(
          await saveEntityPayload('new', payload, {
            createEntity: nextPayload => apiMessagePost<number>('/entities', nextPayload),
            updateEntity: nextPayload => apiMessagePut<void>('/entities', nextPayload),
            buildCreateSuccessMessage: id => t('entities.editor.message.create-success', { id }),
            saveSuccessMessage: t('common.save-success')
          })
        );
      } else {
        setMessage(
          await saveEntityPayload('edit', payload, {
            createEntity: nextPayload => apiMessagePost<number>('/entities', nextPayload),
            updateEntity: nextPayload => apiMessagePut<void>('/entities', nextPayload),
            buildCreateSuccessMessage: id => t('entities.editor.message.create-success', { id }),
            saveSuccessMessage: t('common.save-success')
          })
        );
      }
      setMessageTone('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('common.save-failed'));
      setMessageTone('error');
    } finally {
      setSaving(false);
    }
  }

  if (mode === 'new' || mode === 'edit') {
    const isEditMode = mode === 'edit';
    const editorTitle = isEditMode ? '编辑实体' : '新建实体';
    const editorCopy = isEditMode
      ? '先在页面中建立实体记录，再逐步补充证据、负责人和依赖关系。'
      : '先在页面中建立实体记录，再逐步补齐证据、负责人和依赖关系。';
    const editorFreshness = isEditMode ? '75% 最近更新' : '0% 最近更新';
    const submitLabel = isEditMode ? '保存' : '创建实体';
    const coldFieldLabelTextClassName = 'text-[12px] font-semibold text-[#8d95a5]';
    const coldInputClassName =
      'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] text-[#dbe4f0] placeholder:text-[#6f7787] focus-visible:border-[#4e74f8] focus-visible:bg-[#151923] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]';
    const coldNameInputClassName =
      'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[13px] text-[#f5f7fb] placeholder:text-[#6f7787] focus-visible:border-[#4e74f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]';
    const entityTypeCards: EntityTypeCard[] = [
      { value: 'system', label: '系统', description: '业务域或产品线', icon: Network },
      { value: 'service', label: '服务', description: '对外提供业务能力的应用或接口', icon: Cable },
      { value: 'host', label: '主机', description: '承载服务的运行节点', icon: Monitor },
      { value: 'database', label: '数据库', description: '数据持久化实例', icon: Database },
      { value: 'queue', label: '队列', description: '异步消息通道', icon: ListTree },
      { value: 'middleware', label: '中间件', description: '共享基础组件', icon: Server },
      { value: 'api', label: 'API', description: '接口或网关资源', icon: Braces },
      { value: 'endpoint', label: '端点', description: '可观测访问入口', icon: Globe2 },
      { value: 'device', label: '设备', description: '网络或边缘设备', icon: Layers3 },
      { value: 'k8s_workload', label: 'K8s 工作负载', description: 'K8s 原生工作负载', icon: Boxes }
    ];
    const entrySources: Array<{ value: 'manual' | 'telemetry' | 'definition'; label: string; icon: LucideIcon }> = [
      { value: 'manual', label: '页面录入', icon: PencilLine },
      { value: 'telemetry', label: '遥测发现', icon: Network },
      { value: 'definition', label: '定义优先', icon: Braces }
    ];
    const editorStages = [
      { key: 'basic' as const, label: '基本信息', description: '先确认类型、名称和核心元数据。' },
      { key: 'ownership' as const, label: '归属与处置', description: '补齐负责人、联系人和处置入口。' },
      { key: 'signals' as const, label: '证据关联', description: '绑定监控、身份标识和遥测证据。' },
      { key: 'relations' as const, label: '关系与扩展', description: '记录上下游关系、标签和扩展字段。' }
    ];
    const activeStageCopy = editorStages.find(stage => stage.key === activeStage) || editorStages[0];
    const selectedEntrySource =
      (draft.entity.source || '').trim() === 'otel_resource'
        ? 'telemetry'
        : (draft.entity.source || '').trim() === 'definition'
          ? 'definition'
          : 'manual';
    const bodyDataAttrs = detailsExpanded
      ? { 'data-entity-editor-body': 'cold-single-stage' }
      : { 'data-entity-editor-body-placement': 'cold-deferred-body' };

    const renderField = (
      label: string,
      value: string,
      placeholder: string,
      onChange: (value: string) => void,
      extraClassName = '',
      ariaLabel = label
    ) => (
      <label className={cn('grid gap-2', extraClassName)}>
        <span className={coldFieldLabelTextClassName}>{label}</span>
        <Input
          aria-label={ariaLabel}
          className={coldInputClassName}
          value={value}
          placeholder={placeholder}
          onChange={event => onChange(event.target.value)}
        />
      </label>
    );

    return (
      <form
        data-entity-editor-form="true"
        onSubmit={event => {
          event.preventDefault();
          void save();
        }}
      >
        <div
          data-entity-editor-shell="otlp-cold-entity-composer"
          data-entity-editor-style-baseline="hertzbeat-cold-matte"
          data-entity-editor-layout="full-width-workbench"
          className="grid gap-3 text-[#dbe4f0]"
        >
          <header data-entity-editor-header="cold-compact-header" className="grid gap-2">
            <div className="text-[12px] font-medium text-[#98a2b3]">实体</div>
            <div data-entity-editor-header-rhythm="cold-compact" className="mb-1 grid gap-2">
              <div className="text-[24px] font-semibold leading-none text-[#f5f7fb]">{editorTitle}</div>
              <p className="text-[13px] leading-5 text-[#a8b0bf]">{editorCopy}</p>
              <div data-entity-editor-route-tabs="cold-segmented-tabs" className="flex flex-wrap gap-2">
                {['实体详情', '监控中心', '日志管理与统计', '链路'].map((tab, index) => (
                  <span
                    key={tab}
                    className={cn(
                      'inline-flex h-8 items-center border px-3 text-[12px] font-semibold',
                      index === 0
                        ? 'rounded-[3px] border-[#31405c] bg-[#182238] text-[#f5f7fb]'
                        : 'rounded-[3px] border-[#2b3039] bg-[#101217] text-[#98a2b3]'
                    )}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <section
            data-entity-editor-frame="cold-editor-frame"
            data-entity-editor-frame-spacing="cold-tight"
            className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-4 py-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
          >
            <div
              data-entity-editor-summary-card="cold-editor-panel"
              className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2b3039] px-4 py-3">
                <div className="grid gap-2">
                  <Link href="/entities" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#d8e4ff]">
                    <span aria-hidden="true">←</span>
                    全部实体
                  </Link>
                  {isEditMode && entityId ? (
                    <Link
                      href={`/entities/${entityId}/definition`}
                      data-entity-editor-definition-handoff="cold-hidden"
                      className="sr-only"
                    >
                      定义工作区
                    </Link>
                  ) : null}
                  <div className="grid gap-1">
                    <div className="text-[11px] font-semibold text-[#8d95a5]">实体</div>
                    <div className="text-[18px] font-semibold leading-none text-[#f5f7fb]">{editorTitle}</div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    data-entity-editor-preview-toggle="true"
                    className="h-8 rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151923]"
                    onClick={() => setPreviewRailCollapsed(current => !current)}
                  >
                    <ListTree size={14} aria-hidden="true" data-entity-editor-preview-toggle-icon="cold" />
                    {previewRailCollapsed ? '显示快照' : '隐藏快照'}
                  </Button>
                  <span className="inline-flex min-h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[11px] text-[#98a2b3]">
                    定义版本 · HertzBeat v1 / OTel 资源规范
                  </span>
                  <span className="inline-flex min-h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[11px] text-[#98a2b3]">
                    {editorFreshness}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 px-4 pt-3">
                <label className="grid gap-2">
                  <span className={coldFieldLabelTextClassName}>名称</span>
                  <Input
                    aria-label="名称"
                    className={coldNameInputClassName}
                    required
                    maxLength={128}
                    value={draft.entity.name || ''}
                    placeholder="实体唯一名称"
                    onChange={event => updateEntityField('name', event.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-4 px-4 pb-3 pt-2 max-xl:grid-cols-1">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <div className="text-[11px] font-semibold text-[#8d95a5]">类型</div>
                    <div
                      data-entity-editor-type-strip="cold-catalog-grid"
                      data-entity-editor-type-strip-layout="cold-compact-grid"
                      className="grid gap-2 md:grid-cols-3 xl:grid-cols-4"
                    >
                      {entityTypeCards.map(card => {
                        const active = (draft.entity.type || 'service') === card.value;
                        const TypeIcon = card.icon;
                        return (
                          <button
                            key={card.value}
                            type="button"
                            data-entity-editor-type-card-density="cold-compact-card"
                            className={cn(
                              'flex min-h-[46px] items-start gap-2 border px-3 py-1.5 text-left transition-colors',
                              cn('rounded-[4px]', active ? 'border-[#4e74f8] bg-[#182238]' : 'border-[#2b3039] bg-[#101217] hover:border-[#3b4454] hover:bg-[#151923]')
                            )}
                            onClick={() => updateEntityField('type', card.value)}
                          >
                            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-[3px] border border-[#2b3039] bg-[#0b0c0e] text-[#d8e4ff]">
                              <TypeIcon
                                aria-hidden="true"
                                data-entity-type-icon={card.value}
                                className="h-3.5 w-3.5 stroke-[2]"
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
                    <div className="text-[11px] font-semibold text-[#8d95a5]">录入来源</div>
                    <div data-entity-editor-entry-strip="cold-segmented-pills" className="inline-flex rounded-[3px] border border-[#2b3039] bg-[#101217] p-[3px]">
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
                            onClick={() => updateEntityField('source', source.value === 'manual' ? 'manual' : source.value)}
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

                  <div className="grid gap-2">
                    <div className="text-[11px] font-semibold text-[#8d95a5]">编辑阶段</div>
                    <div
                      data-entity-editor-stage-strip="cold-stage-grid"
                      data-entity-editor-edit-stage-posture={isCompleteContextStage ? 'cold-complete-context' : undefined}
                      className="grid gap-2 md:grid-cols-4"
                    >
                      {editorStages.map(stage => {
                        const active = activeStage === stage.key;
                        const done = coldStageRows.find(row => row.key === stage.key)?.done;
                        return (
                          <button
                            key={stage.key}
                            type="button"
                            data-entity-editor-stage={stage.key}
                            data-entity-editor-stage-status={`${stage.key}-${done ? 'ready' : 'next'}`}
                            className={cn(
                              'flex min-h-[64px] items-start gap-2 border px-3 py-2 text-left',
                              cn('rounded-[4px]', active ? 'border-[#4e74f8] bg-[#182238]' : done ? 'border-[#24533a] bg-[#101914]' : 'border-[#2b3039] bg-[#101217]')
                            )}
                            onClick={() => {
                              setActiveStage(stage.key);
                              setDetailsExpanded(true);
                            }}
                          >
                            <span
                              className={cn(
                                'inline-flex h-[18px] w-[18px] flex-none items-center justify-center text-[10px] font-bold',
                                cn('rounded-[3px]', done ? 'bg-[#14532d] text-[#d7f5df]' : 'bg-[#1b2029] text-[#8d95a5]')
                              )}
                            >
                              {done ? '✓' : '·'}
                            </span>
                            <span className="grid gap-0.5">
                              <span className="text-[12px] font-semibold text-[#f5f7fb]">{stage.label}</span>
                              {active ? <span className="text-[10px] leading-[1.35] text-[#98a2b3]">{stage.description}</span> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {!previewRailCollapsed ? (
                  <aside
                    className="self-start rounded-[4px] border border-[#2b3039] bg-[#101217] p-3"
                    data-entity-editor-preview-rail="cold-inline-preview"
                    data-entity-editor-preview-rail-density="cold-inline-preview"
                  >
                    <div className="text-[14px] font-semibold text-[#f5f7fb]">实体元数据</div>
                    <p className="mt-2 text-[13px] leading-5 text-[#98a2b3]">查看或粘贴定义，应用到表单。</p>
                  </aside>
                ) : null}
              </div>

            </div>

            <div
              data-entity-editor-definition-footer="cold-definition-footer"
              className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-[#2b3039] pt-3"
            >
              <div>
                <div className="text-[12px] font-semibold text-[#dbe4f0]">定义内容</div>
                <div className="mt-1 text-[12px] leading-5 text-[#98a2b3]">查看或粘贴定义，应用到表单。</div>
              </div>
              <div data-entity-editor-definition-tabs="cold-bottom-tabs" className="inline-flex overflow-hidden rounded-[3px] border border-[#2b3039]">
                {[
                  ['editor', '表单'],
                  ['yaml', 'YAML'],
                  ['json', 'JSON']
                ].map(([value, label]) => (
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
            className={cn(
              detailsExpanded
                ? 'rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-4 py-4'
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
                className="mb-4 grid gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <div className="text-[13px] font-semibold text-[#dbe4f0]">{telemetryHandoff.title}</div>
                    <div className="text-[12px] text-[#98a2b3]">{telemetryHandoff.copy}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
                    <span className="rounded-[3px] border border-[#31405c] bg-[#182238] px-2.5 py-1 text-[#d8e4ff]">
                      {`${telemetryHandoff.monitorCount} 个监控绑定`}
                    </span>
                    <span className="rounded-[3px] border border-[#2b3039] bg-[#0b0c0e] px-2.5 py-1 text-[#98a2b3]">
                      {`${telemetryHandoff.identityCount} 个身份标识`}
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
                  <div className="text-[12px] font-semibold text-[#dbe4f0]">归因检查</div>
                  <div className="grid gap-2 md:grid-cols-5">
                    {attributionRows.map(row => (
                      <div
                        key={row.key}
                        data-entity-editor-attribution-row={row.key}
                        data-entity-editor-attribution-state={row.state}
                        className="grid min-h-[92px] gap-1 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[12px] font-semibold text-[#f5f7fb]">{row.title}</div>
                          <span className={cn('rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold', attributionStateClassName(row.state))}>
                            {attributionStateLabel(row.state)}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#dbe4f0]">{row.copy}</div>
                        {row.href ? (
                          <Link href={row.href} className="text-[11px] font-semibold text-[#d8e4ff]">
                            {row.meta}
                          </Link>
                        ) : (
                          <div className="text-[11px] leading-4 text-[#98a2b3]">{row.meta}</div>
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
                      {renderField('显示名称', draft.entity.displayName || '', '例如 Checkout API', value => updateEntityField('displayName', value))}
                      {renderField('命名空间', draft.entity.namespace || '', '例如 commerce', value => updateEntityField('namespace', value))}
                      {renderField('环境', draft.entity.environment || '', '例如 prod', value => updateEntityField('environment', value))}
                      {renderField('子类型', draft.entity.subtype || '', '例如 http', value => updateEntityField('subtype', value))}
                      {renderField('负责人', draft.entity.owner || '', '例如 payments-team', value => updateEntityField('owner', value))}
                      {renderField('所属系统', draft.entity.system || '', '例如 website', value => updateEntityField('system', value))}
                      {renderField('来源', draft.entity.source || '', 'manual', value => updateEntityField('source', value))}
                    </div>
                    <label className="grid gap-2">
                      <span className={coldFieldLabelTextClassName}>描述</span>
                      <Textarea
                        data-entity-editor-description-textarea="cold-textarea"
                        className="min-h-[112px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] placeholder:text-[#6f7787] focus-visible:border-[#4e74f8]"
                        value={draft.entity.description || ''}
                        placeholder="例如负责交易结算和支付编排。"
                        onChange={event => updateEntityField('description', event.target.value)}
                      />
                    </label>
                  </>
                ) : null}

                {activeStage === 'ownership' ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {renderField('负责人', draft.entity.owner || '', 'payments-team', value => updateEntityField('owner', value))}
                    {renderField('运行手册', draft.entity.runbook || '', 'https://runbook.internal/...', value => updateEntityField('runbook', value))}
                    <ContactEditor
                      value={contacts}
                      onChange={setContacts}
                      title="联系人"
                      addLabel="新增联系人"
                      deleteLabel={t('common.remove')}
                      namePlaceholder="联系人"
                      typePlaceholder="类型"
                      valuePlaceholder="联系方式"
                      contactPlaceholder="联系字段"
                    />
                    <LinkEditor
                      value={links}
                      onChange={setLinks}
                      title="链接"
                      addLabel="新增链接"
                      deleteLabel={t('common.remove')}
                      namePlaceholder="链接名称"
                      typePlaceholder="类型"
                      providerPlaceholder="提供方"
                      urlPlaceholder="链接地址"
                    />
                  </div>
                ) : null}

                {activeStage === 'signals' ? (
                  <div className="grid gap-3">
                    <JsonObjectListEditor label="身份标识" value={identitiesItems} addCopy="新增身份标识" onChange={setIdentitiesItems} itemLabel={t('common.item')} deleteLabel={t('common.remove')} />
                    <JsonObjectListEditor label="监控绑定" value={monitorBindItems} addCopy="新增监控绑定" onChange={setMonitorBindItems} itemLabel={t('common.item')} deleteLabel={t('common.remove')} />
                    <JsonObjectListEditor label="关系" value={relationItems} addCopy="新增关系" onChange={setRelationItems} itemLabel={t('common.item')} deleteLabel={t('common.remove')} />
                  </div>
                ) : null}

                {activeStage === 'relations' ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <MultiValueField label="上级组件" value={componentOfText} placeholder="payment-platform, commerce" onChange={setComponentOfText} />
                    <MultiValueField label="下级组件" value={componentsText} placeholder="checkout-ui, order-router" onChange={setComponentsText} />
                    <MultiValueField label="实现服务" value={implementedByText} placeholder="checkout-api, order-worker" onChange={setImplementedByText} />
                    <MultiValueField label="开发语言" value={languagesText} placeholder="java, typescript" onChange={setLanguagesText} />
                    <KeyValueEditor label="标签" rows={labelRows} onChange={setLabelRows} keyPlaceholder="标签键" valuePlaceholder="标签值" deleteLabel={t('common.remove')} addLabel="新增标签" />
                  </div>
                ) : null}
              </div>
            ) : (
              <div data-entity-editor-mode={editorSurfaceMode} className="grid gap-3">
                <ColdCodeEditor
                  readOnly
                  data-entity-editor-definition-preview={editorSurfaceMode}
                  data-entity-editor-definition-code-editor="preview"
                  language={editorSurfaceMode === 'yaml' ? 'yaml' : 'json'}
                  minHeight="280px"
                  ariaLabel={editorSurfaceMode === 'yaml' ? 'YAML 定义快照' : 'JSON 定义快照'}
                  value={definitionPreview}
                />
              </div>
            )}
          </section>

          {message ? (
            <div className={cn('text-[10px] uppercase tracking-[0.2em]', messageTone === 'success' ? 'text-emerald-600' : 'text-rose-600')}>
              {message}
            </div>
          ) : null}

          <div
            data-entity-editor-footer="true"
            className={cn(
              detailsExpanded
                ? 'flex flex-wrap items-center justify-end gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-4 py-3'
                : 'sr-only'
            )}
          >
            <Link href="/entities" className={buttonVariants({ variant: 'subtle', size: 'sm' })}>
              取消
            </Link>
            <Button type="submit" size="sm" variant="primary" disabled={saving}>
              {saving ? '保存中' : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return null;
}
