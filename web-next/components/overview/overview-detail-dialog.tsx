'use client';

import * as React from 'react';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

type OverviewDetailSection = {
  label: string;
  value: string;
};

function resolveBadgeVariant(severity?: string) {
  switch (`${severity || ''}`.toLowerCase()) {
    case 'critical':
    case 'error':
      return 'danger' as const;
    case 'healthy':
      return 'success' as const;
    case 'warning':
      return 'accent' as const;
    default:
      return 'default' as const;
  }
}

export function OverviewDetailDialog({
  open,
  onClose,
  kicker,
  title,
  subtitle,
  description,
  status,
  statusLabel,
  sections,
  closeLabel
}: {
  open: boolean;
  onClose: () => void;
  kicker?: string;
  title: string;
  subtitle: string;
  description: string;
  status?: string;
  statusLabel?: string;
  sections: OverviewDetailSection[];
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
      <div className="grid gap-4" data-overview-detail-dialog="true">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-2">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{subtitle}</div>
            <div className="text-[13px] leading-[1.6] text-[var(--ops-text-secondary)]">{description}</div>
          </div>
          {statusLabel ? <Badge variant={resolveBadgeVariant(status)}>{statusLabel}</Badge> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map(section => (
            <div
              key={`${section.label}-${section.value}`}
              className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2.5"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-tertiary)]">{section.label}</div>
              <div className="mt-1 text-[13px] font-semibold text-[var(--ops-text-primary)]">{section.value}</div>
            </div>
          ))}
        </div>
      </div>
    </OverlayDialog>
  );
}
