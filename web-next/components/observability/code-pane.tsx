import * as React from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function CodePane({
  children,
  className,
  maxHeight = 'max-h-[280px]'
}: {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}) {
  return (
    <pre
      className={cn(
        maxHeight,
        'hb-scrollbar overflow-auto rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] p-3 text-[11px] leading-5 text-[var(--ops-text-secondary)] shadow-none',
        className
      )}
    >
      {children}
    </pre>
  );
}
