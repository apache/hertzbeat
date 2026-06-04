import * as React from 'react';
import { Checkbox } from './checkbox';
import { cn } from '../../lib/utils';

export type WeekdayPickerOption = {
  value: number;
  label: React.ReactNode;
};

export interface WeekdayPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  name: string;
  value: string;
  options: WeekdayPickerOption[];
  onChange: (value: string) => void;
}

function parseDays(value: string) {
  return new Set(
    value
      .split(',')
      .map(item => Number.parseInt(item.trim(), 10))
      .filter(day => Number.isFinite(day))
  );
}

export function WeekdayPicker({ name, value, options, onChange, className, ...props }: WeekdayPickerProps) {
  const selected = parseDays(value);

  function updateDay(day: number, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(day);
    } else {
      next.delete(day);
    }
    onChange(options.filter(option => next.has(option.value)).map(option => String(option.value)).join(','));
  }

  return (
    <div
      data-hz-weekday-picker-owner="hertzbeat-ui-weekday-picker"
      className={cn('flex min-w-0 flex-wrap gap-2 rounded-[3px] border border-[#2b3039] bg-[#0d1015] p-2', className)}
      {...props}
    >
      {options.map(option => (
        <Checkbox
          key={option.value}
          data-hz-weekday-option={String(option.value)}
          name={name}
          value={option.value}
          checked={selected.has(option.value)}
          label={option.label}
          containerClassName={cn(
            'min-h-7 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5',
            selected.has(option.value) ? 'border-[#5d76d9] bg-[#141b2b] text-[#dbe4f0]' : undefined
          )}
          onChange={event => updateDay(option.value, event.target.checked)}
        />
      ))}
    </div>
  );
}
