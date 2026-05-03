import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  resize?: 'none' | 'vertical';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, resize = 'none', ...props }, ref) => (
    <textarea
      ref={ref}
      data-cold-textarea-owner="cold-textarea"
      className={cn(
        'min-h-[96px] w-full rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2 text-[12px] leading-5 text-[var(--ops-text-primary)] placeholder:text-[var(--ops-text-tertiary)] shadow-none transition-colors focus-visible:border-[var(--ops-primary)] focus-visible:bg-[var(--ops-surface-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]',
        resize === 'none' ? 'resize-none' : 'resize-y',
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';

export { Textarea };
