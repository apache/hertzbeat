'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/providers/i18n-provider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ColdCodeEditor } from '../ui/cold-code-editor';
import { NumberStepper } from '../ui/number-stepper';
import { SurfaceSection } from '@/components/workbench/primitives';
import { RowList, WorkbenchPage } from '@/components/workbench/workbench-page';
import { apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import {
  createMonitor,
  detectMonitor,
  loadMonitorScrapeDraft,
  syncMonitorDependentDisplay,
  type MonitorEditorDraft,
  type MonitorEditorMode,
  updateMonitor,
  updateMonitorEditorParam,
  validateMonitorEditorDraft
} from '@/lib/monitor-editor/controller';
import { buildMonitorEditorReturnUrl, type MonitorEditorReturnContext } from '@/lib/monitor-editor/navigation';
import { resolveLocalizedText } from '@/lib/monitor-editor/localized-text';
import type { KeyValueDraft } from '@/lib/entity-editor/draft-utils';
import { fromKeyValueDraft, toKeyValueDraft } from '@/lib/entity-editor/draft-utils';
import { ensureKeyValueRows, removeRowAt, updateRowAt } from '@/lib/entity-editor/editor-state';

const fieldLabelClassName = 'text-[10px] uppercase tracking-[0.22em] text-[var(--ops-text-tertiary)]';

function MonitorParamField({
  field,
  define,
  locale,
  onChange
}: {
  field: { paramValue?: unknown };
  define: {
    field: string;
    name?: string | Record<string, string>;
    type?: string;
    placeholder?: string | Record<string, string>;
    options?: Array<{ label?: string | Record<string, string>; value?: string }>;
  };
  locale: string;
  onChange: (value: unknown) => void;
}) {
  const label = resolveLocalizedText(define.name, locale, define.field);
  const placeholder = resolveLocalizedText(define.placeholder, locale, '');
  if (define.type === 'boolean') {
    return (
      <div className="grid gap-2">
        <span className={fieldLabelClassName}>{label}</span>
        <Checkbox
          data-monitor-param-checkbox={define.field}
          checked={Boolean(field.paramValue)}
          onChange={e => onChange(e.target.checked)}
          label={label}
        />
      </div>
    );
  }
  if (define.type === 'radio' && (define.options || []).length > 0) {
    return (
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>{label}</span>
        <Select value={String(field.paramValue ?? '')} onChange={e => onChange(e.target.value)}>
          {(define.options || []).map(option => (
            <option key={option.value} value={option.value}>
              {resolveLocalizedText(option.label, locale, option.value || '')}
            </option>
          ))}
        </Select>
      </label>
    );
  }
  if (define.type === 'key-value' || define.type === 'array') {
    return (
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>{label}</span>
        <ColdCodeEditor
          data-monitor-param-code-editor={define.type}
          data-monitor-param-field={define.field}
          value={String(field.paramValue ?? '')}
          language="json"
          minHeight="120px"
          placeholder={placeholder}
          ariaLabel={label}
          onChange={nextValue => onChange(nextValue)}
        />
      </label>
    );
  }
  if (define.type === 'number') {
    return (
      <label className="grid gap-2">
        <span className={fieldLabelClassName}>{label}</span>
        <NumberStepper
          data-monitor-param-number-stepper={define.field}
          value={String(field.paramValue ?? '')}
          placeholder={placeholder}
          onValueChange={value => onChange(value === '' ? null : Number(value))}
        />
      </label>
    );
  }
  return (
    <label className="grid gap-2">
      <span className={fieldLabelClassName}>{label}</span>
      <Input
        type="text"
        value={String(field.paramValue ?? '')}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </label>
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

function KeyValueEditor({
  title,
  rows,
  onChange,
  addLabel,
  removeLabel,
  keyPlaceholder,
  valuePlaceholder
}: {
  title: string;
  rows: KeyValueDraft[];
  onChange: (rows: KeyValueDraft[]) => void;
  addLabel: string;
  removeLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  const nextRows = ensureKeyValueRows(rows);
  return (
    <div className="grid gap-3">
      <div className={fieldLabelClassName}>{title}</div>
      {nextRows.map((row, index) => (
        <div key={`${title}-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
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
          <Button type="button" size="sm" variant="subtle" onClick={() => onChange(removeRowAt(nextRows, index))}>
            {removeLabel}
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="subtle" onClick={() => onChange([...nextRows, { key: '', value: '' }])}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
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
  const [labelRows, setLabelRows] = useState<KeyValueDraft[]>(toKeyValueDraft(initial.monitor.labels));
  const [annotationRows, setAnnotationRows] = useState<KeyValueDraft[]>(toKeyValueDraft(initial.monitor.annotations));
  const [grafanaTemplateText, setGrafanaTemplateText] = useState(initial.grafanaDashboard.template || '');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const scrapeParamsRef = useRef(draft.scrapeParams);

  useEffect(() => {
    setDraft(syncMonitorDependentDisplay(initial));
    setLabelRows(toKeyValueDraft(initial.monitor.labels));
    setAnnotationRows(toKeyValueDraft(initial.monitor.annotations));
    setGrafanaTemplateText(initial.grafanaDashboard.template || '');
  }, [initial]);

  useEffect(() => {
    scrapeParamsRef.current = draft.scrapeParams;
  }, [draft.scrapeParams]);

  useEffect(() => {
    const scrape = draft.monitor.scrape || 'static';
    let cancelled = false;
    setScrapeLoading(true);
    loadMonitorScrapeDraft(apiMessageGet, scrape, scrapeParamsRef.current)
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
    setDraft(prev => updateMonitorEditorParam(prev, kind, index, value));
  }

  function buildDraftForSubmit() {
    return {
      ...draft,
      monitor: {
        ...draft.monitor,
        labels: fromKeyValueDraft(labelRows),
        annotations: fromKeyValueDraft(annotationRows)
      },
      grafanaDashboard: {
        ...draft.grafanaDashboard,
        template: grafanaTemplateText
      }
    } satisfies MonitorEditorDraft;
  }

  function validateBeforeSubmit(nextDraft: MonitorEditorDraft) {
    const labelError = validateMetadataRows(labelRows, t('label.bind'));
    if (labelError) return labelError;
    const annotationError = validateMetadataRows(annotationRows, t('common.annotation.bind'));
    if (annotationError) return annotationError;
    return validateMonitorEditorDraft(nextDraft, t);
  }

  async function handleDetect() {
    setSaving(true);
    try {
      const nextDraft = buildDraftForSubmit();
      const validationError = validateBeforeSubmit(nextDraft);
      if (validationError) {
        setActionError(validationError);
        setActionMessage(null);
        return;
      }
      await detectMonitor(apiMessagePost as any, nextDraft);
      setActionMessage(t('monitor.detect.success'));
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('monitor.detect.failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const nextDraft = buildDraftForSubmit();
      const validationError = validateBeforeSubmit(nextDraft);
      if (validationError) {
        setActionError(validationError);
        setActionMessage(null);
        return;
      }
      if (mode === 'new') {
        await createMonitor(apiMessagePost as any, nextDraft);
        setActionMessage(t('monitor.new.success'));
      } else {
        await updateMonitor(apiMessagePut as any, nextDraft);
        setActionMessage(t('monitor.edit.success'));
      }
      setActionError(null);
      router.push(buildMonitorEditorReturnUrl(nextDraft.monitor.app, returnContext ? { ...returnContext } : undefined));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : mode === 'new' ? t('monitor.new.failed') : t('monitor.edit.failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={event => {
        event.preventDefault();
        void handleSave();
      }}
    >
      <WorkbenchPage
        kicker={t('monitor.form.shell.kicker')}
        title={mode === 'new' ? t('monitor.new-monitor') : draft.monitor.name || t('monitor.edit-monitor')}
        subtitle={mode === 'new' ? t('monitor.form.shell.new.copy') : t('monitor.form.shell.edit.copy')}
        tone="operator"
        facts={[
          { label: t('common.app'), value: draft.monitor.app || '-' },
          { label: t('common.scrape'), value: draft.monitor.scrape || 'static' },
          { label: t('common.mode'), value: mode }
        ]}
        actions={
          <>
            <Button type="button" size="sm" variant="default" onClick={() => void handleDetect()} disabled={saving}>
              {t('common.button.detect')}
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={saving}>
              {t('common.button.ok')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="subtle"
              data-monitor-editor-cancel-action="true"
              onClick={() => router.push(buildMonitorEditorReturnUrl(draft.monitor.app, returnContext ? { ...returnContext } : undefined))}
            >
              {t('common.button.cancel')}
            </Button>
          </>
        }
        main={
          <div className="space-y-4">
            <SurfaceSection title={t('monitor.editor.section.base')} copy={t('monitor.editor.section.base.copy')}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className={fieldLabelClassName}>{t('common.app')}</span>
                  <Input value={draft.monitor.app || ''} onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, app: e.target.value } }))} disabled={mode === 'edit'} />
                </label>
                <label className="grid gap-2">
                  <span className={fieldLabelClassName}>{t('monitor.scrape')}</span>
                  <Select value={draft.monitor.scrape || 'static'} onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, scrape: e.target.value } }))}>
                    <option value="static">static</option>
                    <option value="http_sd">http_sd</option>
                    <option value="nacos_sd">nacos_sd</option>
                    <option value="dns_sd">dns_sd</option>
                    <option value="eureka_sd">eureka_sd</option>
                    <option value="consul_sd">consul_sd</option>
                    <option value="zookeeper_sd">zookeeper_sd</option>
                  </Select>
                </label>
                <label className="grid gap-2">
                  <span className={fieldLabelClassName}>{t('monitor.name')}</span>
                  <Input value={draft.monitor.name || ''} onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, name: e.target.value } }))} />
                </label>
                <label className="grid gap-2">
                  <span className={fieldLabelClassName}>{t('monitor.collector')}</span>
                  <Select value={draft.collector || ''} onChange={e => setDraft(prev => ({ ...prev, collector: e.target.value }))}>
                    <option value="">{t('common.none')}</option>
                    {draft.collectors.map(collector => (
                      <option key={collector} value={collector}>
                        {collector}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-2">
                  <span className={fieldLabelClassName}>{t('monitor.scheduleType')}</span>
                  <Select value={draft.monitor.scheduleType || 'interval'} onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, scheduleType: e.target.value } }))}>
                    <option value="interval">{t('monitor.scheduleType.interval')}</option>
                    <option value="cron">{t('monitor.scheduleType.cron')}</option>
                  </Select>
                </label>
                {draft.monitor.scheduleType === 'cron' ? (
                  <label className="grid gap-2">
                    <span className={fieldLabelClassName}>{t('monitor.cronExpression')}</span>
                    <Input value={draft.monitor.cronExpression || ''} onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, cronExpression: e.target.value } }))} />
                  </label>
                ) : (
                  <label className="grid gap-2">
                    <span className={fieldLabelClassName}>{t('monitor.intervals')}</span>
                    <NumberStepper
                      name="intervals"
                      min="1"
                      step="1"
                      data-monitor-interval-stepper="cold-number-stepper"
                      value={String(draft.monitor.intervals ?? 60)}
                      onValueChange={value => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, intervals: value === '' ? null : Number(value) } }))}
                    />
                  </label>
                )}
              </div>
            </SurfaceSection>

            <SurfaceSection title={t('monitor.editor.section.params')} copy={t('monitor.editor.section.params.copy')}>
              <div className="grid gap-3 md:grid-cols-2">
                {draft.paramDefines.map((define, index) => (
                  draft.params[index]?.display === false ? null : <MonitorParamField key={`param-${define.field}`} field={draft.params[index] || {}} define={define} locale={locale} onChange={value => updateParam('params', index, value)} />
                ))}
                {draft.scrapeParamDefines.map((define, index) => (
                  draft.scrapeParams[index]?.display === false ? null : <MonitorParamField key={`scrape-${define.field}`} field={draft.scrapeParams[index] || {}} define={define} locale={locale} onChange={value => updateParam('scrapeParams', index, value)} />
                ))}
              </div>
              {scrapeLoading ? <div className="text-sm text-[var(--ops-text-secondary)]">{t('common.loading')}</div> : null}
            </SurfaceSection>

            {draft.advancedParamDefines.length > 0 ? (
              <SurfaceSection title={t('monitor.advanced')} copy={t('monitor.editor.section.advanced.copy')}>
                <div className="grid gap-3 md:grid-cols-2">
                  {draft.advancedParamDefines.map((define, index) => (
                    draft.advancedParams[index]?.display === false ? null : <MonitorParamField key={`advanced-${define.field}`} field={draft.advancedParams[index] || {}} define={define} locale={locale} onChange={value => updateParam('advancedParams', index, value)} />
                  ))}
                </div>
              </SurfaceSection>
            ) : null}
          </div>
        }
        side={
          <>
            <SurfaceSection title={t('common.description')} copy={t('monitor.description.tip')}>
              <Textarea
                data-monitor-description-textarea="cold-textarea"
                className="min-h-[120px]"
                value={draft.monitor.description || ''}
                onChange={e => setDraft(prev => ({ ...prev, monitor: { ...prev.monitor, description: e.target.value } }))}
              />
            </SurfaceSection>
            <SurfaceSection title={t('label.bind')} copy={t('monitor.editor.labels.copy')}>
              <KeyValueEditor
                title={t('label.bind')}
                rows={labelRows}
                onChange={setLabelRows}
                addLabel={t('monitor.editor.labels.add')}
                removeLabel={t('monitor.editor.labels.remove')}
                keyPlaceholder={t('monitor.editor.labels.key')}
                valuePlaceholder={t('monitor.editor.labels.value')}
              />
            </SurfaceSection>
            <SurfaceSection title={t('common.annotation.bind')} copy={t('monitor.editor.annotations.copy')}>
              <KeyValueEditor
                title={t('common.annotation.bind')}
                rows={annotationRows}
                onChange={setAnnotationRows}
                addLabel={t('monitor.editor.annotations.add')}
                removeLabel={t('monitor.editor.annotations.remove')}
                keyPlaceholder={t('monitor.editor.annotations.key')}
                valuePlaceholder={t('monitor.editor.annotations.value')}
              />
            </SurfaceSection>
            {draft.monitor.app === 'prometheus' ? (
              <SurfaceSection title={t('monitor.grafana.enabled.label')} copy={t('monitor.grafana.upload.tip')}>
                <Checkbox
                  containerClassName="mb-3"
                  data-monitor-grafana-enabled-checkbox="cold-checkbox"
                  checked={Boolean(draft.grafanaDashboard.enabled)}
                  onChange={e => setDraft(prev => ({ ...prev, grafanaDashboard: { ...prev.grafanaDashboard, enabled: e.target.checked } }))}
                  label={t('monitor.grafana.enabled.label')}
                />
                {draft.grafanaDashboard.enabled ? (
                  <ColdCodeEditor
                    name="grafana_dashboard_template"
                    value={grafanaTemplateText}
                    language="json"
                    minHeight="120px"
                    ariaLabel={t('monitor.grafana.enabled.label')}
                    data-monitor-grafana-code-editor="dashboard-template"
                    onChange={setGrafanaTemplateText}
                  />
                ) : null}
              </SurfaceSection>
            ) : null}
            <SurfaceSection title={t('monitor.editor.section.payload')} copy={t('monitor.editor.section.payload.copy')}>
              <RowList
                rows={[
                  { title: t('common.app'), copy: draft.monitor.app || '-', meta: draft.monitor.scrape || 'static' },
                  { title: t('monitor.name'), copy: draft.monitor.name || '-', meta: draft.collector || '-' }
                ]}
              />
            </SurfaceSection>
            {actionMessage ? <div className="text-sm text-emerald-300">{actionMessage}</div> : null}
            {actionError ? <div className="text-sm text-rose-300">{actionError}</div> : null}
          </>
        }
      />
    </form>
  );
}
