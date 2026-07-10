'use client';

import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { HzCodeEditor } from '../ui/hz-code-editor';
import { OverlayDialog } from '../workbench/overlay-dialog';
import type { BulletinFormDraft } from '../../lib/bulletin-center/controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function BulletinManageDialog({
  open,
  mode,
  draft,
  error,
  saving,
  t,
  onClose,
  onSave,
  onDraftChange
}: {
  open: boolean;
  mode: 'new' | 'edit';
  draft: BulletinFormDraft;
  error: string | null;
  saving: boolean;
  t: Translator;
  onClose: () => void;
  onSave: () => void;
  onDraftChange: (nextDraft: BulletinFormDraft) => void;
}) {
  return (
    <OverlayDialog
      open={open}
      onClose={onClose}
      closeLabel={t('common.dialog.close')}
      kicker={t('menu.monitor.bulletin')}
      title={mode === 'new' ? t('bulletin.new') : t('bulletin.edit')}
      maxWidthClassName="max-w-4xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" variant="primary" onClick={onSave} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
        <div className="pt-2 text-right text-[12px] font-medium text-[var(--ops-text-secondary)]">{t('bulletin.name')}</div>
        <Input
          aria-label={t('bulletin.name')}
          value={draft.name}
          onChange={event => onDraftChange({ ...draft, name: event.target.value })}
          className="h-10 border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-primary)]"
        />

        <div className="pt-2 text-right text-[12px] font-medium text-[var(--ops-text-secondary)]">{t('bulletin.monitor.type')}</div>
        <Input
          aria-label={t('bulletin.monitor.type')}
          value={draft.app}
          onChange={event => onDraftChange({ ...draft, app: event.target.value })}
          className="h-10 border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-primary)]"
        />

        <div className="pt-2 text-right text-[12px] font-medium text-[var(--ops-text-secondary)]">{t('bulletin.monitor.name')}</div>
        <Input
          aria-label={t('bulletin.monitor.name')}
          value={draft.monitorIdsText}
          onChange={event => onDraftChange({ ...draft, monitorIdsText: event.target.value })}
          placeholder={t('bulletin.monitor.ids.placeholder')}
          className="h-10 border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-primary)] placeholder:text-[var(--ops-text-tertiary)]"
        />

        <div className="pt-2 text-right text-[12px] font-medium text-[var(--ops-text-secondary)]">{t('bulletin.monitor.metrics')}</div>
        <HzCodeEditor
          data-bulletin-fields-code-editor="metrics-json"
          language="json"
          minHeight="260px"
          ariaLabel={t('bulletin.monitor.metrics')}
          value={draft.fieldsJson}
          onChange={nextValue => onDraftChange({ ...draft, fieldsJson: nextValue })}
        />
      </div>
      {error ? <div className="mt-4 text-sm text-rose-300">{error}</div> : null}
    </OverlayDialog>
  );
}
