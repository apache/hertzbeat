'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { WorkspaceShell } from '../observability/workspace-shell';

export function ThreeSignalDeskShell({
  className,
  mainClassName,
  railClassName,
  ...props
}: React.ComponentProps<typeof WorkspaceShell>) {
  return (
    <WorkspaceShell
      {...props}
      className={cn(className)}
      mainClassName={cn('bg-[var(--ops-surface-panel)] p-3', mainClassName)}
      railClassName={cn('bg-[var(--ops-surface-elevated)] p-3', railClassName)}
    />
  );
}
