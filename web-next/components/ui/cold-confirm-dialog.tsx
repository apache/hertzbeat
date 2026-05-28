'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';

function translateColdConfirm(key: string) {
  return SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;
}

type ColdConfirmDialogProps = {
  open: boolean;
  title: string;
  copy: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ColdConfirmDialog({
  open,
  title,
  copy,
  confirmLabel,
  cancelLabel,
  pending = false,
  onCancel,
  onConfirm
}: ColdConfirmDialogProps) {
  return (
    <OverlayDialog
      open={open}
      title={title}
      kicker={translateColdConfirm('common.confirm.operation')}
      onClose={pending ? () => undefined : onCancel}
      maxWidthClassName="max-w-md"
      contentClassName="py-4"
      footer={
        <div className="flex justify-end gap-2" data-cold-confirm-actions="true">
          <Button size="sm" variant="subtle" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button size="sm" variant="primary" onClick={onConfirm} disabled={pending}>
            {pending ? translateColdConfirm('common.processing') : confirmLabel}
          </Button>
        </div>
      }
    >
      <div data-cold-confirm-dialog="cold-confirm-dialog" className="flex gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[#31405c] bg-[#182238] text-[#d8e4ff]">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-6 text-[#a9b0bb]">{copy}</p>
      </div>
    </OverlayDialog>
  );
}
