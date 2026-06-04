import * as React from 'react';
import { cn } from '../../lib/utils';
import { HiddenInput } from './hidden-input';

export type SegmentedControlOption = {
  value: string;
  label: React.ReactNode;
};

export interface SegmentedControlProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange'> {
  name?: string;
  value: string;
  options: SegmentedControlOption[];
  onChange: (value: string) => void;
}

export function SegmentedControl({ name, value, options, onChange, className, ...props }: SegmentedControlProps) {
  return (
    <span
      data-hz-segmented-control-owner="hertzbeat-ui-segmented-control"
      role="radiogroup"
      className={cn('inline-flex min-h-8 overflow-hidden rounded-[3px] border border-[#2b3039] bg-[#101217] p-0.5', className)}
      {...props}
    >
      {name ? <HiddenInput name={name} value={value} data-hz-segmented-control-value="hidden" /> : null}
      {options.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-hz-segmented-control-option={option.value}
            className={cn(
              'h-7 min-w-[96px] rounded-[3px] px-3 text-[12px] font-semibold transition-colors',
              selected ? 'bg-[#182238] text-[#dbe4f0]' : 'text-[#8f99ab] hover:bg-[#151b28] hover:text-[#dbe4f0]'
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}
