import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] border text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.16)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)] shadow-none hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-elevated)] hover:text-[var(--ops-text-primary)]',
        primary:
          'border-[var(--ops-primary)] bg-[var(--ops-primary)] text-white shadow-none hover:brightness-[1.04]',
        ghost:
          'border-transparent bg-transparent text-[var(--ops-text-secondary)] shadow-none hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]',
        subtle:
          'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-primary)] shadow-none hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-elevated)] hover:text-[var(--ops-text-primary)]'
      },
      size: {
        default: 'h-8 min-w-[96px] px-3 py-1.5',
        sm: 'h-7 min-w-[88px] px-3 text-[11px]',
        lg: 'h-9 min-w-[112px] px-4 text-[12px]',
        icon: 'h-8 w-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));

Button.displayName = 'Button';

export { Button, buttonVariants };
