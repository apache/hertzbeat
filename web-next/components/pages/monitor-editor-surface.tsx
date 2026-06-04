'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { HzButton, HzCheckbox, HzCodeEditor, HzConfigurableFieldEditor, HzField, HzFileInput, HzInlineFeedback, HzInput, HzKeyValueEditor, HzLoadingState, HzMonitorEditorActionBar, HzMonitorEditorFieldGrid, HzMonitorEditorForm, HzMonitorEditorHeader, HzMonitorEditorSection, HzNumberStepper, HzRadioButtonGroup, HzSelect, HzSwitch, HzTextarea, type HzMutationStatus } from '@hertzbeat/ui';
import { useI18n } from '@/components/providers/i18n-provider';
import { api } from '@/lib/monitor-api-facade';
import {
  createMonitorFromFacade,
  detectMonitorFromFacade,
  applyMonitorHostNameAutofill,
  loadMonitorScrapeDraftFromFacade,
  resolveMonitorEditorParamChangeNotice,
  shouldPreserveMonitorScrapeParamsForLoad,
  syncMonitorDependentDisplay,
  type MonitorCollectorOption,
  type MonitorEditorDraft,
  type MonitorEditorMode,
  updateMonitorFromFacade,
  updateMonitorEditorParam,
  validateMonitorEditorDraft
} from '@/lib/monitor-editor/controller';
import { buildMonitorEditorCancelUrl, buildMonitorEditorReturnUrl, type MonitorEditorReturnContext } from '@/lib/monitor-editor/navigation';
import { resolveLocalizedText } from '@/lib/monitor-editor/localized-text';
import type { KeyValueDraft } from '@/lib/entity-editor/draft-utils';
import { fromKeyValueDraft, toKeyValueDraft } from '@/lib/entity-editor/draft-utils';
import { LabelRecordInput } from '../ui/label-record-input';

function parseMonitorKeyValueRows(value: unknown): KeyValueDraft[] {
  if (Array.isArray(value)) {
    const rows = value.map(item => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return {
          key: String(record.key ?? ''),
          value: String(record.value ?? '')
        };
      }
      return { key: String(item ?? ''), value: '' };
    });
    return rows.length > 0 ? rows : [{ key: '', value: '' }];
  }

  if (value && typeof value === 'object') {
    return toKeyValueDraft(
      Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [key, String(entryValue ?? '')])
      )
    );
  }

  if (typeof value !== 'string') {
    return [{ key: '', value: '' }];
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '""') {
    return [{ key: '', value: '' }];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parseMonitorKeyValueRows(parsed);
    }
    if (parsed && typeof parsed === 'object') {
      return parseMonitorKeyValueRows(parsed);
    }
    if (typeof parsed === 'string') {
      return parsed.trim() ? [{ key: '', value: parsed }] : [{ key: '', value: '' }];
    }
  } catch {
    // Keep non-JSON legacy values visible instead of silently dropping operator input.
  }

  return [{ key: '', value: trimmed }];
}

function stringifyMonitorKeyValueRows(rows: KeyValueDraft[]) {
  return JSON.stringify(fromKeyValueDraft(rows));
}

function parseMonitorConfigurableRows(value: unknown, keys: string[]): Record<string, string>[] {
  if (Array.isArray(value)) {
    const rows = value.map(item => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return Object.fromEntries(keys.map(key => [key, String(record[key] ?? '')]));
      }
      return Object.fromEntries(keys.map((key, index) => [key, index === 0 ? String(item ?? '') : '']));
    });
    return rows.length > 0 ? rows : [{}];
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [Object.fromEntries(keys.map(key => [key, String(record[key] ?? '')]))];
  }

  return [{}];
}

function stringifyMonitorLabelSelectorValue(labels?: Record<string, unknown>) {
  return Object.entries(labels || {})
    .filter(([key]) => key.trim())
    .map(([key, value]) => {
      const normalizedKey = key.trim();
      const normalizedValue = String(value ?? '').trim();
      return normalizedValue ? `${normalizedKey}:${normalizedValue}` : normalizedKey;
    })
    .join(', ');
}

function parseMonitorLabelSelectorValue(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, item) => {
      const [rawKey, ...rawValueParts] = item.split(':');
      const key = rawKey.trim();
      if (!key) return acc;
      const labelValue = rawValueParts.join(':').trim();
      acc[key] = labelValue || key;
      return acc;
    }, {});
}

function normalizeCollectorOption(option: MonitorCollectorOption | string): MonitorCollectorOption | null {
  if (typeof option === 'string') {
    return option.trim() ? { name: option.trim() } : null;
  }
  const name = option.name?.trim();
  return name ? { ...option, name } : null;
}

function isCollectorOnline(option: MonitorCollectorOption) {
  if (typeof option.online === 'boolean') return option.online;
  const status = String(option.status ?? '').toLowerCase();
  return status === '0' || status === 'online' || status === 'true';
}

function collectorModeLabel(mode: string | null | undefined, t: (key: string) => string) {
  return mode === 'private' ? t('collector.mode.private') : t('collector.mode.public');
}

function collectorStatusLabel(option: MonitorCollectorOption, t: (key: string) => string) {
  return isCollectorOnline(option) ? t('monitor.collector.status.online') : t('monitor.collector.status.offline');
}

function formatCollectorOptionLabel(option: MonitorCollectorOption, t: (key: string) => string) {
  return [option.name, option.ip, collectorStatusLabel(option, t), collectorModeLabel(option.mode, t)].filter(Boolean).join(' · ');
}

function resolveMonitorIntervalStepperBounds(app?: string | null) {
  const fastInterval = app === 'push';
  return {
    min: fastInterval ? 1 : 10,
    step: fastInterval ? 1 : 10,
    max: 604800
  };
}

function MonitorParamField({
  field,
  define,
  locale,
  t,
  onChange
}: {
  field: { paramValue?: unknown };
  define: {
    field: string;
    name?: string | Record<string, string>;
    type?: string;
    placeholder?: string | Record<string, string>;
    options?: Array<{ label?: string | Record<string, string>; value?: string }>;
    keyAlias?: string;
    valueAlias?: string;
  };
  locale: string;
  t: (key: string) => string;
  onChange: (value: unknown) => void;
}) {
  const label = resolveLocalizedText(define.name, locale, define.field);
  const placeholder = resolveLocalizedText(define.placeholder, locale, '');
  if (define.type === 'boolean') {
    return (
      <HzField as="div" label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
        <HzSwitch
          data-monitor-param-switch={define.field}
          data-monitor-param-boolean-contract="angular-nz-switch"
          data-monitor-param-field={define.field}
          data-monitor-editor-switch-owner="hertzbeat-ui-switch"
          checked={Boolean(field.paramValue)}
          onCheckedChange={checked => onChange(checked)}
          aria-label={label}
          label={label}
        />
      </HzField>
    );
  }
  if (define.type === 'radio' && (define.options || []).length > 0) {
    const radioOptions = (define.options || []).map(option => ({
      value: option.value || '',
      label: resolveLocalizedText(option.label, locale, option.value || '')
    }));
    return (
      <HzField as="div" label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
        <HzRadioButtonGroup
          name={define.field}
          value={String(field.paramValue ?? '')}
          options={radioOptions}
          data-monitor-param-radio={define.field}
          data-monitor-param-radio-contract="angular-nz-radio-group-button-solid"
          data-monitor-param-field={define.field}
          data-monitor-editor-radio-owner="hertzbeat-ui-radio-button-group"
          aria-label={label}
          onChange={value => onChange(value)}
        />
      </HzField>
    );
  }
  if (define.type === 'key-value') {
    return (
      <HzField as="div" label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
        <HzKeyValueEditor
          data-monitor-param-key-value-editor={define.field}
          data-monitor-param-field={define.field}
          data-monitor-editor-key-value-owner="hertzbeat-ui-key-value-editor"
          rows={parseMonitorKeyValueRows(field.paramValue)}
          onChange={rows => onChange(stringifyMonitorKeyValueRows(rows))}
          addLabel={t('common.add')}
          removeLabel={t('common.remove')}
          keyPlaceholder={define.keyAlias || t('monitor.editor.labels.key')}
          valuePlaceholder={define.valueAlias || t('monitor.editor.labels.value')}
        />
      </HzField>
    );
  }
  if (define.type === 'labels') {
    return (
      <HzField as="div" label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
        <HzKeyValueEditor
          data-monitor-param-labels-editor={define.field}
          data-monitor-param-labels-contract="angular-app-configurable-field-key-value"
          data-monitor-param-field={define.field}
          data-monitor-editor-labels-owner="hertzbeat-ui-key-value-editor"
          rows={parseMonitorKeyValueRows(field.paramValue)}
          onChange={rows => onChange(stringifyMonitorKeyValueRows(rows))}
          addLabel={t('common.add')}
          removeLabel={t('common.remove')}
          keyPlaceholder={define.keyAlias || t('monitor.editor.labels.key')}
          valuePlaceholder={define.valueAlias || t('monitor.editor.labels.value')}
          keyInputProps={{ 'data-monitor-param-labels-input': 'key' }}
          valueInputProps={{ 'data-monitor-param-labels-input': 'value' }}
        />
      </HzField>
    );
  }
  if (define.type === 'metrics-field') {
    return (
      <HzField as="div" label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
        <HzConfigurableFieldEditor
          rows={parseMonitorConfigurableRows(field.paramValue, ['field', 'unit', 'type'])}
          columns={[
            {
              key: 'field',
              placeholder: 'Field',
              inputProps: { 'data-monitor-param-metrics-field-input': 'field' } as React.ComponentProps<typeof HzConfigurableFieldEditor>['columns'][number]['inputProps']
            },
            {
              key: 'unit',
              placeholder: 'Unit',
              className: 'minmax(50px,90px)',
              inputProps: { 'data-monitor-param-metrics-field-input': 'unit' } as React.ComponentProps<typeof HzConfigurableFieldEditor>['columns'][number]['inputProps']
            },
            {
              key: 'type',
              placeholder: 'Type',
              inputProps: { 'data-monitor-param-metrics-field-input': 'type' } as React.ComponentProps<typeof HzConfigurableFieldEditor>['columns'][number]['inputProps']
            }
          ]}
          onChange={rows => onChange(rows)}
          addLabel={t('common.add')}
          removeLabel={t('common.remove')}
          data-monitor-param-metrics-field-editor={define.field}
          data-monitor-param-metrics-field-contract="angular-app-configurable-field-field-unit-type"
          data-monitor-param-field={define.field}
          data-monitor-editor-metrics-field-owner="hertzbeat-ui-configurable-field-editor"
        />
      </HzField>
    );
  }
  if (define.type === 'array') {
    return (
      <HzField label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
        <HzInput
          type="text"
          data-monitor-param-array-input={define.field}
          data-monitor-param-input={define.field}
          data-monitor-param-field={define.field}
          data-monitor-editor-input-owner="hertzbeat-ui-input"
          value={String(field.paramValue ?? '')}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
        />
      </HzField>
    );
  }
  if (define.type === 'password') {
    return (
      <HzField label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
        <HzInput
          type="password"
          data-monitor-param-password-input={define.field}
          data-monitor-param-password-contract="angular-app-multi-func-password"
          data-monitor-param-input={define.field}
          data-monitor-param-field={define.field}
          data-monitor-editor-input-owner="hertzbeat-ui-input"
          value={String(field.paramValue ?? '')}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
        />
      </HzField>
    );
  }
  if (define.type === 'textarea') {
    return (
      <HzField label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
        <HzTextarea
          height="tall"
          data-monitor-param-textarea={define.field}
          data-monitor-param-textarea-contract="angular-nz-input-textarea-rows-8"
          data-monitor-param-field={define.field}
          data-monitor-editor-textarea-owner="hertzbeat-ui-textarea"
          value={String(field.paramValue ?? '')}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
        />
      </HzField>
    );
  }
  if (define.type === 'number') {
    return (
      <HzField as="div" label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
        <HzNumberStepper
          data-monitor-param-number-stepper={define.field}
          data-monitor-param-number-contract="angular-nz-input-number--1000-65535-step-1"
          data-monitor-param-number-min="-1000"
          data-monitor-param-number-max="65535"
          data-monitor-param-number-step="1"
          data-monitor-editor-number-stepper-owner="hertzbeat-ui-number-stepper"
          value={String(field.paramValue ?? '')}
          min={-1000}
          max={65535}
          step={1}
          placeholder={placeholder}
          decrementLabel={t('common.decrement')}
          incrementLabel={t('common.increment')}
          onValueChange={value => onChange(value === '' ? null : Number(value))}
        />
      </HzField>
    );
  }
  return (
    <HzField label={label} data-monitor-editor-field-owner="hertzbeat-ui-field">
      <HzInput
        type="text"
        data-monitor-param-input={define.field}
        data-monitor-param-field={define.field}
        data-monitor-editor-input-owner="hertzbeat-ui-input"
        data-monitor-editor-host-name-autofill-contract={define.field === 'host' ? 'angular-new-host-change' : undefined}
        value={String(field.paramValue ?? '')}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </HzField>
  );
}

function validateMetadataRows(rows: KeyValueDraft[], sectionLabel: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key && !value) continue;
    if (!key || !value) return `${sectionLabel} entries require both key and value`;
    if (seen.has(key)) return `${sectionLabel} keys must be unique`;
    seen.add(key);
  }
  return null;
}

export function MonitorEditorSurface({
  initial,
  mode,
  returnContext
}: {
  initial: MonitorEditorDraft;
  mode: MonitorEditorMode;
  returnContext?: MonitorEditorReturnContext;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [labelSelectorText, setLabelSelectorText] = useState(stringifyMonitorLabelSelectorValue(initial.monitor.labels));
  const [annotationRows, setAnnotationRows] = useState<KeyValueDraft[]>(toKeyValueDraft(initial.monitor.annotations));
  const [grafanaTemplateText, setGrafanaTemplateText] = useState(initial.grafanaDashboard.template || '');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrorSource, setActionErrorSource] = useState<'validation' | 'api' | null>(null);
  const [actionErrorAction, setActionErrorAction] = useState<'detect' | 'save' | null>(null);
  const [actionPhase, setActionPhase] = useState<'idle' | 'detecting' | 'saving'>('idle');
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const grafanaTemplateInputRef = useRef<HTMLInputElement | null>(null);
  const scrapeParamsRef = useRef(draft.scrapeParams);
  const previousScrapeRef = useRef<string | null>(null);
  const systemDefaultCollectorLabel = t('monitor.collector.system.default');
  const scrapeOptions = [
    { value: 'static', label: 'static' },
    { value: 'http_sd', label: 'http_sd' },
    { value: 'nacos_sd', label: 'nacos_sd' },
    { value: 'dns_sd', label: 'dns_sd' },
    { value: 'eureka_sd', label: 'eureka_sd' },
    { value: 'consul_sd', label: 'consul_sd' },
    { value: 'zookeeper_sd', label: 'zookeeper_sd' }
  ];
  const collectorChoices = draft.collectors.map(normalizeCollectorOption).filter((option): option is MonitorCollectorOption => Boolean(option));
  const selectedCollectorChoice = collectorChoices.find(option => option.name === draft.collector);
  const defaultCollectorModeLabel = collectorModeLabel('public', t);
  const intervalStepperBounds = resolveMonitorIntervalStepperBounds(draft.monitor.app);
  const collectorOptions = [
    { value: '', label: `${systemDefaultCollectorLabel} - ${defaultCollectorModeLabel}` },
    ...collectorChoices.map(collector => ({ value: collector.name, label: formatCollectorOptionLabel(collector, t) }))
  ];
  const scheduleTypeOptions = [
    { value: 'interval', label: t('monitor.scheduleType.interval') },
    { value: 'cron', label: t('monitor.scheduleType.cron') }
  ];
  const staticHostParamIndex = draft.paramDefines.findIndex(define => define.field === 'host');
  const shouldRenderStaticHost =
    (draft.monitor.scrape || 'static') === 'static' &&
    staticHostParamIndex >= 0 &&
    draft.params[staticHostParamIndex]?.display !== false;
  const hasVisibleAdvancedParams = draft.advancedParams.some(param => param?.display !== false);

  useEffect(() => {
    previousScrapeRef.current = null;
    setDraft(syncMonitorDependentDisplay(initial));
    setLabelSelectorText(stringifyMonitorLabelSelectorValue(initial.monitor.labels));
    setAnnotationRows(toKeyValueDraft(initial.monitor.annotations));
    setGrafanaTemplateText(initial.grafanaDashboard.template || '');
    setAdvancedOpen(false);
  }, [initial]);

  useEffect(() => {
    scrapeParamsRef.current = draft.scrapeParams;
  }, [draft.scrapeParams]);

  useEffect(() => {
    const scrape = draft.monitor.scrape || 'static';
    let cancelled = false;
    const previousScrape = previousScrapeRef.current;
    const shouldPreserveExistingParams = shouldPreserveMonitorScrapeParamsForLoad(previousScrape, scrape);
    previousScrapeRef.current = scrape;
    if (scrape === 'static') {
      setScrapeLoading(false);
      setDraft(prev => {
        if (prev.scrapeParams.length === 0 && prev.scrapeParamDefines.length === 0) {
          return prev;
        }
        return syncMonitorDependentDisplay({
          ...prev,
          scrapeParams: [],
          scrapeParamDefines: []
        });
      });
      return () => {
        cancelled = true;
      };
    }
    setScrapeLoading(true);
    loadMonitorScrapeDraftFromFacade(api.monitors.editorParamDefines, scrape, shouldPreserveExistingParams ? scrapeParamsRef.current : undefined)
      .then(result => {
        if (cancelled) return;
        setDraft(prev =>
          syncMonitorDependentDisplay({
            ...prev,
            scrapeParams: result.scrapeParams,
            scrapeParamDefines: result.scrapeParamDefines
          })
        );
      })
      .catch(error => {
        if (cancelled) return;
        setActionError(error instanceof Error ? error.message : t('common.load-failed'));
      })
      .finally(() => {
        if (!cancelled) setScrapeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.monitor.scrape, t]);

  function updateParam(kind: 'params' | 'advancedParams' | 'scrapeParams', index: number, value: unknown) {
    const noticeKey = resolveMonitorEditorParamChangeNotice(draft, kind, index, value);
    setDraft(prev => {
      const nextDraft = updateMonitorEditorParam(prev, kind, index, value);
      const defines = kind === 'params' ? prev.paramDefines : kind === 'advancedParams' ? prev.advancedParamDefines : prev.scrapeParamDefines;
      return applyMonitorHostNameAutofill(nextDraft, { mode, field: defines[index]?.field });
    });
    if (noticeKey) {
      setActionMessage(t(noticeKey));
      setActionError(null);
      setActionErrorSource(null);
      setActionErrorAction(null);
    }
  }

  async function handleGrafanaTemplateUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const template = await file.text();
    setGrafanaTemplateText(template);
    setDraft(prev => ({
      ...prev,
      grafanaDashboard: {
        ...prev.grafanaDashboard,
        template
      }
    }));
  }

  function buildDraftForSubmit() {
    return {
      ...draft,
      monitor: {
        ...draft.monitor,
        labels: parseMonitorLabelSelectorValue(labelSelectorText),
        annotations: fromKeyValueDraft(annotationRows)
      },
      grafanaDashboard: {
        ...draft.grafanaDashboard,
        template: grafanaTemplateText
      }
    } satisfies MonitorEditorDraft;
  }

  function validateBeforeSubmit(nextDraft: MonitorEditorDraft, options: { validateCronFormat?: boolean } = {}) {
    const labelError = validateMetadataRows(toKeyValueDraft(parseMonitorLabelSelectorValue(labelSelectorText)), t('label.bind'));
    if (labelError) return labelError;
    const annotationError = validateMetadataRows(annotationRows, t('common.annotation.bind'));
    if (annotationError) return annotationError;
    return validateMonitorEditorDraft(nextDraft, t, options);
  }

  const actionBusy = actionPhase !== 'idle';
  const busyActionLabel = actionPhase === 'detecting' ? t('monitor.spinning-tip.detecting') : t('common.loading');
  const mutationStatus: HzMutationStatus = actionBusy ? 'saving' : actionError ? 'failed' : actionMessage ? 'saved' : 'clean';
  const saveReturnUrl = buildMonitorEditorReturnUrl(draft.monitor.app, returnContext ? { ...returnContext } : undefined);
  const cancelReturnUrl = buildMonitorEditorCancelUrl(returnContext ? { ...returnContext } : undefined);
  const saveReturnContract = returnContext?.returnTo ? 'safe-return-context-or-angular-app-list' : 'angular-app-list';
  const cancelReturnContract = returnContext?.returnTo ? 'safe-return-context-or-list-root' : 'legacy-list-root';
  const mutationStatusLabel =
    actionBusy
      ? busyActionLabel
      : mutationStatus === 'failed'
        ? t('common.failed')
        : mutationStatus === 'saved'
          ? actionMessage || t('common.ready')
          : t('common.ready');
  const mutationFeedback = actionBusy ? (
    <HzInlineFeedback
      tone="info"
      title={busyActionLabel}
      variant="embedded"
      data-monitor-editor-feedback-owner="hertzbeat-ui-inline-feedback"
      data-monitor-editor-feedback="busy"
      data-monitor-editor-busy-contract="angular-spin-tip"
      data-monitor-editor-busy-phase={actionPhase}
    />
  ) : actionError ? (
    <HzInlineFeedback
      tone="critical"
      title={t('common.failed')}
      description={actionError}
      variant="embedded"
      data-monitor-editor-feedback-owner="hertzbeat-ui-inline-feedback"
      data-monitor-editor-feedback="error"
      data-monitor-editor-validation-contract={actionErrorSource === 'validation' ? 'angular-form-required' : undefined}
      data-monitor-editor-api-error-contract={actionErrorSource === 'api' ? 'angular-message-msg' : undefined}
      data-monitor-editor-blocked-action={actionErrorAction || undefined}
      data-monitor-editor-blocked-before-api={actionErrorSource === 'validation' ? 'true' : undefined}
    />
  ) : actionMessage ? (
    <HzInlineFeedback
      tone="success"
      title={actionMessage}
      variant="embedded"
      data-monitor-editor-feedback-owner="hertzbeat-ui-inline-feedback"
      data-monitor-editor-feedback="success"
    />
  ) : null;
  const mutationBar = (
    <HzMonitorEditorActionBar
      title={mode === 'new' ? t('monitor.new-monitor') : draft.monitor.name || t('monitor.edit-monitor')}
      status={mutationStatus}
      statusLabel={mutationStatusLabel}
      summaryVisible={false}
      actionAlign="center"
      feedback={mutationFeedback}
      data-monitor-editor-action-dock="bottom"
      data-monitor-editor-mutation-bar="true"
      actions={[
        {
          id: 'detect',
          label: t('common.button.detect'),
          intent: 'ghost',
          disabled: actionBusy,
          onSelect: () => void handleDetect(),
          buttonProps: {
            'data-monitor-editor-detect-action': 'true',
            'data-monitor-editor-detect-busy-label': t('monitor.spinning-tip.detecting'),
            'data-monitor-editor-detect-cron-validation': 'angular-detect-skips-cron-format'
          }
        },
        {
          id: 'submit',
          label: t('common.button.ok'),
          type: 'submit',
          intent: 'primary',
          disabled: actionBusy,
          buttonProps: {
            'data-monitor-editor-submit-action': 'true',
            'data-monitor-editor-submit-busy-label': t('common.loading'),
            'data-monitor-editor-save-return': saveReturnContract,
            'data-monitor-editor-save-return-target': saveReturnUrl,
            'data-monitor-editor-save-notification-contract': 'angular-success-before-return'
          }
        },
        {
          id: 'cancel',
          label: t('common.button.cancel'),
          intent: 'ghost',
          onSelect: () => router.push(cancelReturnUrl),
          buttonProps: {
            'data-monitor-editor-cancel-action': 'true',
            'data-monitor-editor-cancel-return': cancelReturnContract,
            'data-monitor-editor-cancel-return-target': cancelReturnUrl
          }
        }
      ]}
    />
  );

  async function handleDetect() {
    setActionPhase('detecting');
    setActionErrorSource(null);
    setActionErrorAction(null);
    try {
      const nextDraft = buildDraftForSubmit();
      const validationError = validateBeforeSubmit(nextDraft, { validateCronFormat: false });
      if (validationError) {
        setActionError(validationError);
        setActionErrorSource('validation');
        setActionErrorAction('detect');
        setActionMessage(null);
        return;
      }
      await detectMonitorFromFacade(api.monitors.detect, nextDraft);
      setActionMessage(t('monitor.detect.success'));
      setActionError(null);
      setActionErrorSource(null);
      setActionErrorAction(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('monitor.detect.failed'));
      setActionErrorSource('api');
      setActionErrorAction('detect');
    } finally {
      setActionPhase('idle');
    }
  }

  async function handleSave() {
    setActionPhase('saving');
    setActionErrorSource(null);
    setActionErrorAction(null);
    try {
      const nextDraft = buildDraftForSubmit();
      const validationError = validateBeforeSubmit(nextDraft);
      if (validationError) {
        setActionError(validationError);
        setActionErrorSource('validation');
        setActionErrorAction('save');
        setActionMessage(null);
        return;
      }
      if (mode === 'new') {
        await createMonitorFromFacade(api.monitors.create, nextDraft);
        setActionMessage(t('monitor.new.success'));
      } else {
        await updateMonitorFromFacade(api.monitors.update, nextDraft);
        setActionMessage(t('monitor.edit.success'));
      }
      setActionError(null);
      setActionErrorSource(null);
      setActionErrorAction(null);
      router.push(buildMonitorEditorReturnUrl(nextDraft.monitor.app, returnContext ? { ...returnContext } : undefined));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : mode === 'new' ? t('monitor.new.failed') : t('monitor.edit.failed'));
      setActionErrorSource('api');
      setActionErrorAction('save');
    } finally {
      setActionPhase('idle');
    }
  }

  return (
    <HzMonitorEditorForm
      actionBar={mutationBar}
      onSubmit={event => {
        event.preventDefault();
        void handleSave();
      }}
      data-monitor-editor-form-owner="hertzbeat-ui-monitor-editor-form"
      data-monitor-editor-app-source="angular-route-context-hidden-field"
      data-monitor-editor-static-host-position="angular-before-name"
      data-monitor-editor-field-order="angular-monitor-form-sequence"
      data-monitor-editor-detect-payload-contract="angular-monitor-collector-params-no-grafana"
      data-monitor-editor-save-payload-contract="angular-monitor-collector-params-grafana"
      data-monitor-editor-payload-param-merge="angular-params-advanced-sdparams"
      data-monitor-editor-payload-host-instance="angular-host-param-as-instance"
      data-monitor-editor-service-discovery-params="angular-nonstatic-only"
      data-monitor-editor-scrape-reload-contract="angular-reset-on-user-scrape-change"
      data-monitor-editor-ssl-port-notice="angular-info-notification"
      data-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"
      data-monitor-editor-advanced-visible-contract="angular-visible-param-only"
      data-monitor-editor-label-selector="angular-app-label-selector"
      data-monitor-editor-collector-selection="angular-collectors-selection-tags"
      data-monitor-editor-detect-cron-validation="angular-detect-skips-cron-format"
      data-monitor-editor-cron-required="angular-required-before-detect-save"
    >
      <input
        type="hidden"
        name="app"
        value={draft.monitor.app || ''}
        readOnly
        data-monitor-editor-hidden-app="route-or-detail-context"
      />
      <HzMonitorEditorHeader
        title={mode === 'new' ? t('monitor.new-monitor') : draft.monitor.name || t('monitor.edit-monitor')}
        data-monitor-editor-linear-header="hertzbeat-ui-monitor-editor-header"
      />

        <HzMonitorEditorSection data-monitor-editor-section-owner="hertzbeat-ui-editor-section" title={t('monitor.editor.section.base')}>
          <HzMonitorEditorFieldGrid data-monitor-editor-field-grid-owner="hertzbeat-ui-monitor-editor-field-grid">
            <HzField label={t('monitor.scrape')} data-monitor-editor-field-owner="hertzbeat-ui-field">
              <HzSelect
                value={draft.monitor.scrape || 'static'}
                aria-label={t('monitor.scrape')}
                options={scrapeOptions}
                data-monitor-editor-select="scrape"
                data-monitor-editor-select-owner="hertzbeat-ui-select"
                onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, scrape: e.target.value } }))}
              />
            </HzField>
            {draft.monitor.scrape !== 'static'
              ? draft.scrapeParamDefines.map((define, index) => (
                  draft.scrapeParams[index]?.display === false ? null : (
                    <div
                      key={`scrape-${define.field}`}
                      data-monitor-editor-scrape-param-order="angular-after-scrape-before-name"
                    >
                      <MonitorParamField
                        field={draft.scrapeParams[index] || {}}
                        define={define}
                        locale={locale}
                        t={t}
                        onChange={value => updateParam('scrapeParams', index, value)}
                      />
                    </div>
                  )
                ))
              : null}
            {shouldRenderStaticHost ? (
              <div data-monitor-editor-static-host-field="angular-before-name">
                <MonitorParamField
                  field={draft.params[staticHostParamIndex] || {}}
                  define={draft.paramDefines[staticHostParamIndex]}
                  locale={locale}
                  t={t}
                  onChange={value => updateParam('params', staticHostParamIndex, value)}
                />
              </div>
            ) : null}
            <HzField label={t('monitor.name')} data-monitor-editor-field-owner="hertzbeat-ui-field">
              <HzInput
                value={draft.monitor.name || ''}
                data-monitor-editor-input="name"
                data-monitor-editor-input-owner="hertzbeat-ui-input"
                data-monitor-editor-host-name-autofill-target={mode === 'new' ? 'monitor-name' : undefined}
                onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, name: e.target.value } }))}
              />
            </HzField>
          </HzMonitorEditorFieldGrid>
        </HzMonitorEditorSection>

        <HzMonitorEditorSection data-monitor-editor-section-owner="hertzbeat-ui-editor-section" title={t('monitor.editor.section.params')}>
          <HzMonitorEditorFieldGrid data-monitor-editor-field-grid-owner="hertzbeat-ui-monitor-editor-field-grid">
            {draft.paramDefines.map((define, index) => (
              draft.params[index]?.display === false || define.field === 'host' ? null : <MonitorParamField key={`param-${define.field}`} field={draft.params[index] || {}} define={define} locale={locale} t={t} onChange={value => updateParam('params', index, value)} />
            ))}
          </HzMonitorEditorFieldGrid>
          {scrapeLoading ? (
            <HzLoadingState
              data-monitor-editor-scrape-loading-owner="hertzbeat-ui-loading-state"
              title={t('common.loading')}
              rows={2}
            />
          ) : null}
        </HzMonitorEditorSection>

        {hasVisibleAdvancedParams ? (
          <HzMonitorEditorSection
            data-monitor-editor-section-owner="hertzbeat-ui-editor-section"
            data-monitor-editor-advanced-collapse="angular-ghost-collapse-dashed-trigger"
            data-monitor-editor-advanced-collapse-state={advancedOpen ? 'expanded' : 'collapsed'}
            title={t('monitor.advanced')}
          >
            <HzButton
              type="button"
              size="sm"
              intent="secondary"
              aria-expanded={advancedOpen}
              aria-controls="monitor-editor-advanced-params"
              data-monitor-editor-advanced-toggle="angular-dashed-collapse-trigger"
              data-monitor-editor-advanced-toggle-owner="hertzbeat-ui-button"
              onClick={() => setAdvancedOpen(open => !open)}
            >
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
              />
              {t('monitor.advanced')}
            </HzButton>
            {advancedOpen ? (
              <HzMonitorEditorFieldGrid
                id="monitor-editor-advanced-params"
                className="mt-3"
                data-monitor-editor-field-grid-owner="hertzbeat-ui-monitor-editor-field-grid"
                data-monitor-editor-advanced-fields="expanded"
              >
                {draft.advancedParamDefines.map((define, index) => (
                  draft.advancedParams[index]?.display === false ? null : <MonitorParamField key={`advanced-${define.field}`} field={draft.advancedParams[index] || {}} define={define} locale={locale} t={t} onChange={value => updateParam('advancedParams', index, value)} />
                ))}
              </HzMonitorEditorFieldGrid>
            ) : null}
          </HzMonitorEditorSection>
        ) : null}

        <HzMonitorEditorSection
          data-monitor-editor-section-owner="hertzbeat-ui-editor-section"
          data-monitor-editor-runtime-order="angular-after-advanced-before-labels"
          title={t('monitor.editor.section.runtime')}
        >
          <HzMonitorEditorFieldGrid data-monitor-editor-field-grid-owner="hertzbeat-ui-monitor-editor-field-grid">
            <HzField
              label={t('monitor.collector')}
              data-monitor-editor-field-owner="hertzbeat-ui-field"
              data-monitor-editor-collector-selection="angular-collectors-selection-tags"
            >
              <HzSelect
                value={draft.collector || ''}
                aria-label={t('monitor.collector')}
                options={collectorOptions}
                data-monitor-editor-select="collector"
                data-monitor-editor-select-owner="hertzbeat-ui-select"
                data-monitor-editor-collector-selection-owner="hertzbeat-ui-select"
                optionDataAttributes={option => ({
                  'data-monitor-editor-collector-option': option.value || 'system-default',
                  'data-monitor-editor-collector-option-contract': 'angular-status-ip-mode-tags'
                })}
                onChange={e => setDraft(prev => ({ ...prev, collector: e.target.value }))}
              />
              <div
                className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5"
                data-monitor-editor-collector-tags="angular-status-ip-mode-tags"
              >
                {selectedCollectorChoice ? (
                  <>
                    <span className="border border-[#263552] bg-[#10203a] px-2 py-0.5 text-[10px] font-semibold text-[#d8e4ff]" data-monitor-editor-collector-tag="status">
                      {collectorStatusLabel(selectedCollectorChoice, t)}
                    </span>
                    <span className="border border-[#263552] bg-[#10203a] px-2 py-0.5 text-[10px] font-semibold text-[#d8e4ff]" data-monitor-editor-collector-tag="name">
                      {selectedCollectorChoice.name}
                    </span>
                    {selectedCollectorChoice.ip ? (
                      <span className="border border-[#263552] bg-[#10203a] px-2 py-0.5 text-[10px] font-semibold text-[#d8e4ff]" data-monitor-editor-collector-tag="ip">
                        {selectedCollectorChoice.ip}
                      </span>
                    ) : null}
                    <span className="border border-[#263552] bg-[#10203a] px-2 py-0.5 text-[10px] font-semibold text-[#d8e4ff]" data-monitor-editor-collector-tag="mode">
                      {collectorModeLabel(selectedCollectorChoice.mode, t)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="border border-[#263552] bg-[#10203a] px-2 py-0.5 text-[10px] font-semibold text-[#d8e4ff]" data-monitor-editor-collector-tag="system-default">
                      {systemDefaultCollectorLabel}
                    </span>
                    <span className="border border-[#1f4537] bg-[#0d2a20] px-2 py-0.5 text-[10px] font-semibold text-[#b7f7d0]" data-monitor-editor-collector-tag="mode">
                      {defaultCollectorModeLabel}
                    </span>
                  </>
                )}
              </div>
            </HzField>
            <HzField label={t('monitor.scheduleType')} data-monitor-editor-field-owner="hertzbeat-ui-field">
              <HzSelect
                value={draft.monitor.scheduleType || 'interval'}
                aria-label={t('monitor.scheduleType')}
                options={scheduleTypeOptions}
                data-monitor-editor-select="schedule-type"
                data-monitor-editor-select-owner="hertzbeat-ui-select"
                onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, scheduleType: e.target.value } }))}
              />
            </HzField>
            {draft.monitor.scheduleType === 'cron' ? (
              <HzField label={t('monitor.cronExpression')} data-monitor-editor-field-owner="hertzbeat-ui-field">
                <HzInput
                  value={draft.monitor.cronExpression || ''}
                  required
                  data-monitor-editor-input="cron-expression"
                  data-monitor-editor-input-owner="hertzbeat-ui-input"
                  data-monitor-editor-cron-required="angular-required-before-detect-save"
                  onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, cronExpression: e.target.value } }))}
                />
              </HzField>
            ) : (
              <HzField
                as="div"
                label={t('monitor.intervals')}
                data-monitor-editor-field-owner="hertzbeat-ui-field"
                data-monitor-interval-stepper-contract="angular-min-step-max-by-app"
              >
                <HzNumberStepper
                  name="intervals"
                  min={intervalStepperBounds.min}
                  max={intervalStepperBounds.max}
                  step={intervalStepperBounds.step}
                  data-monitor-interval-stepper="hertzbeat-ui-number-stepper"
                  data-monitor-interval-stepper-min={String(intervalStepperBounds.min)}
                  data-monitor-interval-stepper-max={String(intervalStepperBounds.max)}
                  data-monitor-interval-stepper-step={String(intervalStepperBounds.step)}
                  data-monitor-editor-number-stepper-owner="hertzbeat-ui-number-stepper"
                  value={String(draft.monitor.intervals ?? 60)}
                  decrementLabel={t('common.decrement')}
                  incrementLabel={t('common.increment')}
                  onValueChange={value => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, intervals: value === '' ? null : Number(value) } }))}
                />
                <span
                  className="mt-1 inline-flex text-[10px] font-semibold text-[#7d8798]"
                  data-monitor-interval-stepper-unit="common.time.unit.second"
                >
                  {t('common.time.unit.second')}
                </span>
              </HzField>
            )}
          </HzMonitorEditorFieldGrid>
        </HzMonitorEditorSection>

        <HzMonitorEditorSection data-monitor-editor-section-owner="hertzbeat-ui-editor-section" title={t('label.bind')}>
          <div
            data-monitor-editor-label-selector="angular-app-label-selector"
            data-monitor-editor-label-selector-owner="hertzbeat-ui-label-selector"
          >
            <LabelRecordInput
              name="labels"
              value={labelSelectorText}
              onValueChange={setLabelSelectorText}
              keyPlaceholder={t('monitor.editor.labels.key')}
              valuePlaceholder={t('monitor.editor.labels.value')}
              addLabel={t('monitor.editor.labels.add')}
              removeLabel={t('monitor.editor.labels.remove')}
              containerClassName="min-w-0"
            />
          </div>
        </HzMonitorEditorSection>

        <HzMonitorEditorSection data-monitor-editor-section-owner="hertzbeat-ui-editor-section" title={t('common.annotation.bind')}>
          <HzKeyValueEditor
            data-monitor-editor-key-value="annotations"
            data-monitor-editor-key-value-owner="hertzbeat-ui-key-value-editor"
            title={t('common.annotation.bind')}
            rows={annotationRows}
            onChange={setAnnotationRows}
            addLabel={t('monitor.editor.annotations.add')}
            removeLabel={t('monitor.editor.annotations.remove')}
            keyPlaceholder={t('monitor.editor.annotations.key')}
            valuePlaceholder={t('monitor.editor.annotations.value')}
          />
        </HzMonitorEditorSection>

        <HzMonitorEditorSection data-monitor-editor-section-owner="hertzbeat-ui-editor-section" title={t('common.description')}>
          <HzTextarea
            data-monitor-description-textarea="hertzbeat-ui-textarea"
            data-monitor-editor-textarea-owner="hertzbeat-ui-textarea"
            data-monitor-description-textarea-limit="angular-textarea-limit-100"
            height="tall"
            maxCharacterCount={100}
            value={draft.monitor.description || ''}
            onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, description: e.target.value } }))}
          />
        </HzMonitorEditorSection>

        {draft.monitor.app === 'prometheus' ? (
          <HzMonitorEditorSection data-monitor-editor-section-owner="hertzbeat-ui-editor-section" title={t('monitor.grafana.enabled.label')}>
            <HzCheckbox
              containerClassName="mb-3"
              data-monitor-grafana-enabled-checkbox="hertzbeat-ui-checkbox"
              data-monitor-editor-checkbox="grafana-dashboard-enabled"
              data-monitor-editor-checkbox-owner="hertzbeat-ui-checkbox"
              checked={Boolean(draft.grafanaDashboard.enabled)}
              onChange={e => setDraft(prev => ({ ...prev, grafanaDashboard: { ...prev.grafanaDashboard, enabled: e.target.checked } }))}
              label={t('monitor.grafana.enabled.label')}
            />
            {draft.grafanaDashboard.enabled ? (
              <div
                className="space-y-3"
                data-monitor-grafana-template-input-contract="angular-json-template-upload"
              >
                <div
                  className="flex flex-wrap items-center gap-2"
                  data-monitor-grafana-template-upload="angular-json-template-upload"
                >
                  <HzFileInput
                    ref={grafanaTemplateInputRef}
                    accept=".json,application/json"
                    aria-label={t('monitor.grafana.upload.label')}
                    data-monitor-grafana-template-upload-owner="hertzbeat-ui-file-input"
                    data-monitor-grafana-template-upload-input="json-template"
                    onChange={event => void handleGrafanaTemplateUpload(event)}
                  />
                  <HzButton
                    type="button"
                    size="sm"
                    intent="secondary"
                    data-monitor-grafana-template-upload-trigger-owner="hertzbeat-ui-button"
                    data-monitor-grafana-template-upload-trigger="json-template"
                    onClick={() => grafanaTemplateInputRef.current?.click()}
                  >
                    {t('monitor.grafana.upload.label')}
                  </HzButton>
                  <span className="text-xs text-[var(--hz-ui-text-muted)]">
                    {t('monitor.grafana.upload.tip')}
                  </span>
                </div>
                <HzCodeEditor
                  name="grafana_dashboard_template"
                  value={grafanaTemplateText}
                  language="json"
                  minHeight="120px"
                  ariaLabel={t('monitor.grafana.enabled.label')}
                  data-monitor-editor-code-editor-owner="hertzbeat-ui-code-editor"
                  data-monitor-editor-code-editor="grafana-dashboard-template"
                  data-monitor-grafana-code-editor="dashboard-template"
                  onChange={setGrafanaTemplateText}
                />
              </div>
            ) : null}
          </HzMonitorEditorSection>
        ) : null}
    </HzMonitorEditorForm>
  );
}
