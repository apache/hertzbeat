import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  containerClassName?: string;
  label?: React.ReactNode;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, containerClassName, label, disabled, ...props }, ref) => (
    <label
      data-cold-checkbox-owner="cold-checkbox"
      data-cold-checkbox-click-target="label-shell"
      className={cn(
        'inline-flex min-h-8 items-center gap-2 rounded-[3px] text-[12px] font-semibold text-[#a9b0bb]',
        disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
        containerClassName
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        data-cold-checkbox-control="native-hidden"
        className={cn('peer sr-only', className)}
        {...props}
      />
      <span
        aria-hidden="true"
        data-cold-checkbox-box="indicator"
        className="grid h-4 w-4 place-items-center rounded-[3px] border border-[#394150] bg-[#101217] text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors [&>svg]:opacity-0 peer-checked:border-[#5d76d9] peer-checked:bg-[#182238] peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[rgba(78,116,248,0.18)]"
      >
        <Check className="h-3 w-3 transition-opacity" />
      </span>
      {label ? <span data-cold-checkbox-label="true">{label}</span> : null}
    </label>
  )
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
