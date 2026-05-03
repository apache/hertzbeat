'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export function ActionToolbar({
  left,
  center,
  right,
  className,
  slotClassName
}: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  slotClassName?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)} data-action-toolbar="true">
      <div className={cn('flex flex-wrap items-center gap-2', slotClassName)}>{left}</div>
      <div className={cn('flex flex-wrap items-center gap-2', slotClassName)}>{center}</div>
      <div className={cn('flex flex-wrap items-center justify-end gap-2', slotClassName)}>{right}</div>
    </div>
  );
}
