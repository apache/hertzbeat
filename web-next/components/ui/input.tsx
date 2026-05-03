import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-8 w-full rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-1.5 text-[12px] text-[var(--ops-text-primary)] placeholder:text-[var(--ops-text-tertiary)] shadow-none transition-colors focus-visible:border-[var(--ops-primary)] focus-visible:bg-[var(--ops-surface-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]',
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';

export { Input };
