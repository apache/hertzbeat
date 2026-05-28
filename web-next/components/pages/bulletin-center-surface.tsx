'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, Ellipsis, RefreshCw } from 'lucide-react';
import { useI18n } from '../providers/i18n-provider';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { ActionToolbar } from '../workbench/action-toolbar';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { WorkspaceTabStrip } from '../workbench/workspace-tab-strip';
import { BulletinManageDialog } from './bulletin-manage-dialog';
import { BulletinMetricsTable } from './bulletin-metrics-table';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '../../lib/api-client';
import {
  createBulletin,
  deleteBulletin,
  deleteBulletins,
  loadBulletinMetrics,
  updateBulletin,
  type BulletinFormDraft
} from '../../lib/bulletin-center/controller';
import {
  buildBulletinFacts,
  buildBulletinFormDraft,
  buildBulletinRefreshLabel,
  buildBulletinRefreshPresets,
  buildBulletinTabs,
  pickSelectedBulletin,
  validateBulletinForm
} from '../../lib/bulletin-center/view-model';
import type { Bulletin, BulletinMetricsData, PageResult } from '../../lib/types';

export type BulletinCenterData = {
  list: PageResult<Bulletin>;
};

export function BulletinCenterSurface({
  data,
  refreshTick,
  onReload
}: {
  data: BulletinCenterData;
  refreshTick: number;
  onReload: () => void;
}) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [metricsData, setMetricsData] = useState<BulletinMetricsData | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageMode, setManageMode] = useState<'new' | 'edit'>('new');
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BulletinFormDraft>(() => buildBulletinFormDraft(null));
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshMenuOpen, setRefreshMenuOpen] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(30);
  const [countDownTime, setCountDownTime] = useState(30);
  const [metricsReloadToken, setMetricsReloadToken] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleteIds, setBatchDeleteIds] = useState<number[]>([]);

  const activeBulletin = pickSelectedBulletin(data.list.content, selectedId);
  const facts = buildBulletinFacts(data.list, activeBulletin, t);
  const activeBulletinId = activeBulletin?.id ?? null;
  const currentBulletinName = (activeBulletin?.name || '').trim() || t('common.none');

  useEffect(() => {
    setBatchDeleteIds(current => current.filter(id => data.list.content.some(item => item.id === id)));
  }, [data.list.content]);

  useEffect(() => {
    if (refreshSeconds <= 0 || activeBulletinId == null) {
      setCountDownTime(refreshSeconds);
      return;
    }

    setCountDownTime(refreshSeconds);
    const timer = window.setInterval(() => {
      setCountDownTime(current => {
        if (current <= 1) {
          setMetricsReloadToken(token => token + 1);
          return refreshSeconds;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeBulletinId, refreshSeconds]);

  useEffect(() => {
    if (activeBulletinId == null) {
      setMetricsData(null);
      setMetricsError(null);
      setMetricsLoading(false);
      return;
    }

    let cancelled = false;
    setMetricsLoading(true);
    setMetricsError(null);

    loadBulletinMetrics(apiMessageGet, activeBulletinId)
      .then(result => {
        if (!cancelled) {
          setMetricsData(result);
        }
      })
      .catch(error => {
        if (!cancelled) {
          setMetricsData(null);
          setMetricsError(error instanceof Error ? error.message : t('bulletin.metrics.error-default'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMetricsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeBulletinId, metricsReloadToken, refreshTick, t]);

  function openNewDialog() {
    setDraft(buildBulletinFormDraft(null));
    setEditorError(null);
    setManageMode('new');
    setManageOpen(true);
    setMenuOpen(false);
  }

  function openEditDialog() {
    if (!activeBulletin) {
      return;
    }
    setDraft(buildBulletinFormDraft(activeBulletin));
    setEditorError(null);
    setManageMode('edit');
    setManageOpen(true);
    setMenuOpen(false);
  }

  function triggerMetricsReload() {
    setCountDownTime(refreshSeconds);
    setMetricsReloadToken(token => token + 1);
  }

  async function handleSave() {
    const validationError = validateBulletinForm(draft, t);
    if (validationError) {
      setEditorError(validationError);
      return;
    }

    setEditorSaving(true);
    setEditorError(null);
    try {
      if (manageMode === 'edit' && draft.id) {
        await updateBulletin(apiMessagePut as any, draft);
      } else {
        await createBulletin(apiMessagePost as any, draft);
      }
      setManageOpen(false);
      onReload();
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : t('common.save-failed'));
    } finally {
      setEditorSaving(false);
    }
  }

  async function handleDeleteCurrent() {
    if (!activeBulletin?.id) {
      return;
    }
    setMenuOpen(false);
    await deleteBulletin(apiMessageDelete as any, activeBulletin.id);
    setDeleteDialogOpen(false);
    setSelectedId(null);
    setMetricsData(null);
    onReload();
  }

  function openDeleteDialog() {
    if (!activeBulletin?.id) {
      return;
    }
    setMenuOpen(false);
    setDeleteDialogOpen(true);
  }

  async function handleBatchDelete() {
    if (batchDeleteIds.length === 0) {
      return;
    }
    await deleteBulletins(apiMessageDelete as any, batchDeleteIds);
    setBatchDeleteIds([]);
    setBatchDeleteOpen(false);
    setSelectedId(null);
    setMetricsData(null);
    onReload();
  }

  return (
    <section className="space-y-4" data-bulletin-center-surface="true" data-bulletin-workspace="true">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {facts.map(item => (
          <div key={item.label} className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]">{item.label}</div>
            <div className="mt-1 text-[14px] font-semibold text-[var(--ops-text-primary)]">{item.value}</div>
          </div>
        ))}
      </div>

      <ActionToolbar
        className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 py-2.5"
        left={
          <>
            <Button size="sm" variant="primary" onClick={() => { onReload(); triggerMetricsReload(); }}>
              <RefreshCw size={14} />
              {t('common.refresh')}
            </Button>
            <Button size="sm" variant="primary" onClick={openNewDialog}>
              {t('common.button.new')}
            </Button>
            <div className="relative">
              <Button size="sm" variant="default" onClick={() => setMenuOpen(open => !open)} disabled={!activeBulletin}>
                <Ellipsis size={14} />
              </Button>
              {menuOpen ? (
                <div className="absolute left-0 top-9 z-20 min-w-[180px] rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.42)]">
                  <button
                    type="button"
                    className="flex w-full items-center rounded-[2px] px-3 py-2 text-left text-[12px] text-[var(--ops-text-primary)] transition hover:bg-[var(--ops-surface-raised)]"
                    onClick={openEditDialog}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center rounded-[2px] px-3 py-2 text-left text-[12px] text-rose-300 transition hover:bg-[var(--ops-surface-raised)]"
                    data-bulletin-delete-confirm-trigger="cold-modal"
                    onClick={openDeleteDialog}
                  >
                    {t('common.button.delete')}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center rounded-[2px] px-3 py-2 text-left text-[12px] text-[var(--ops-text-primary)] transition hover:bg-[var(--ops-surface-raised)]"
                    onClick={() => {
                      setBatchDeleteOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    {t('bulletin.batch.delete')}
                  </button>
                </div>
              ) : null}
            </div>
          </>
        }
        right={
          <div className="relative">
            <Button size="sm" variant="default" onClick={() => setRefreshMenuOpen(open => !open)}>
              {buildBulletinRefreshLabel(refreshSeconds, countDownTime, t)}
              <ChevronDown size={14} />
            </Button>
            {refreshMenuOpen ? (
              <div className="absolute right-0 top-9 z-20 min-w-[210px] rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.42)]">
                {buildBulletinRefreshPresets(refreshSeconds, t).map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full items-center rounded-[2px] px-3 py-2 text-left text-[12px] transition ${
                      option.active
                        ? 'bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
                        : 'text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]'
                    }`}
                    onClick={() => {
                      setRefreshSeconds(option.value);
                      setCountDownTime(option.value);
                      setRefreshMenuOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        }
      />

      <div className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]">
        <div className="px-3 pt-3">
          <WorkspaceTabStrip
            tabs={buildBulletinTabs(data.list.content, selectedId).map(tab => ({
              ...tab,
              onSelect: () => {
                const nextId = Number(tab.key);
                setSelectedId(nextId);
                setCountDownTime(refreshSeconds);
              }
            }))}
            variant="card"
            ariaLabel={t('bulletin.navigation.aria')}
          />
        </div>
        <div className="border-t border-[var(--ops-border-color)]">
          <BulletinMetricsTable
            data={metricsData}
            app={activeBulletin?.app || ''}
            loading={metricsLoading}
            error={metricsError}
            t={t}
          />
        </div>
      </div>

      <BulletinManageDialog
        open={manageOpen}
        mode={manageMode}
        draft={draft}
        error={editorError}
        saving={editorSaving}
        t={t}
        onClose={() => setManageOpen(false)}
        onSave={() => void handleSave()}
        onDraftChange={setDraft}
      />

      <OverlayDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        kicker={t('menu.monitor.bulletin')}
        title={t('bulletin.delete.title')}
        maxWidthClassName="max-w-xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="subtle" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" onClick={() => void handleDeleteCurrent()} disabled={!activeBulletin?.id}>
              {t('bulletin.delete.confirm')}
            </Button>
          </div>
        }
      >
        <div data-bulletin-delete-confirm="cold-modal" className="space-y-3 text-[12px] leading-6 text-[var(--ops-text-secondary)]">
          <p>{t('bulletin.delete.copy')}</p>
          <div className="rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2 font-semibold text-[var(--ops-text-primary)]">
            {currentBulletinName}
          </div>
        </div>
      </OverlayDialog>

      <OverlayDialog
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        kicker={t('menu.monitor.bulletin')}
        title={t('bulletin.batch.delete')}
        maxWidthClassName="max-w-2xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="subtle" onClick={() => setBatchDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" onClick={() => void handleBatchDelete()} disabled={batchDeleteIds.length === 0}>
              {t('common.button.delete')}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {data.list.content.map(item => {
            const checked = batchDeleteIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2 text-sm text-[var(--ops-text-primary)]"
              >
                <span>{item.name}</span>
                <Checkbox
                  aria-label={t('common.select')}
                  data-bulletin-batch-delete-checkbox={String(item.id)}
                  checked={checked}
                  onChange={event =>
                    setBatchDeleteIds(current =>
                      event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id)
                    )
                  }
                  label={t('common.select')}
                />
              </div>
            );
          })}
        </div>
      </OverlayDialog>
    </section>
  );
}
