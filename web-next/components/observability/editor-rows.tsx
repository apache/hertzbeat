'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TemplateRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const TemplateRow = React.forwardRef<HTMLButtonElement, TemplateRowProps>(({ className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'w-full rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-4 py-4 text-left text-[var(--ops-text-secondary)] transition-colors hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text-primary)]',
      className
    )}
    {...props}
  />
));

TemplateRow.displayName = 'TemplateRow';
