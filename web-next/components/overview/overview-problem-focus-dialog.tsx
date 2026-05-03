'use client';

import * as React from 'react';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { Button } from '../ui/button';

export function OverviewProblemFocusDialog({
  open,
  onClose,
  kicker,
  title,
  summary,
  subtitle,
  ownerLabel,
  owner,
  entityLabel,
  entity,
  closeLabel
}: {
  open: boolean;
  onClose: () => void;
  kicker: string;
  title: string;
  summary: string;
  subtitle: string;
  ownerLabel: string;
  owner: string;
  entityLabel: string;
  entity: string;
  closeLabel: string;
}) {
  return (
    <OverlayDialog
      open={open}
      onClose={onClose}
      kicker={kicker}
      title={title}
      maxWidthClassName="max-w-2xl"
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="subtle" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4" data-overview-problem-focus-dialog="true">
        <div className="grid gap-2">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{subtitle}</div>
          <div className="text-[13px] leading-[1.6] text-[var(--ops-text-secondary)]">{summary}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-tertiary)]">{ownerLabel}</div>
            <div className="mt-1 text-[13px] font-semibold text-[var(--ops-text-primary)]">{owner}</div>
          </div>
          <div className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-tertiary)]">{entityLabel}</div>
            <div className="mt-1 text-[13px] font-semibold text-[var(--ops-text-primary)]">{entity}</div>
          </div>
        </div>
      </div>
    </OverlayDialog>
  );
}
