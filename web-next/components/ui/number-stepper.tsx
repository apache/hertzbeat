import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

function toNumber(value: string | number | undefined, fallback: number) {
  if (value === undefined || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: string | number | undefined) {
  if (value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

export interface NumberStepperProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
  decrementLabel?: string;
  incrementLabel?: string;
}

const NumberStepper = React.forwardRef<HTMLInputElement, NumberStepperProps>(
  (
    {
      className,
      containerClassName,
      disabled,
      min,
      max,
      step = 1,
      value,
      onValueChange,
      decrementLabel = '减少',
      incrementLabel = '增加',
      ...props
    },
    ref
  ) => {
    const numericStep = Math.max(toNumber(step, 1), 1);
    const minValue = toOptionalNumber(min);
    const maxValue = toOptionalNumber(max);

    function clamp(nextValue: number) {
      if (minValue !== undefined && nextValue < minValue) return minValue;
      if (maxValue !== undefined && nextValue > maxValue) return maxValue;
      return nextValue;
    }

    function shift(direction: 1 | -1) {
      if (disabled) return;
      const fallback = minValue ?? 0;
      const currentValue = toNumber(value, fallback);
      onValueChange(formatNumber(clamp(currentValue + numericStep * direction)));
    }

    return (
      <span
        data-cold-number-stepper-owner="cold-number-stepper"
        className={cn(
          'flex h-8 w-full overflow-hidden rounded-[3px] border border-[#2b3039] bg-[#101217] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus-within:border-[#4e74f8] focus-within:ring-2 focus-within:ring-[rgba(78,116,248,0.12)]',
          disabled ? 'opacity-55' : '',
          containerClassName
        )}
      >
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={value}
          data-cold-number-stepper-input="true"
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent px-3 py-1.5 text-[12px] font-semibold text-[#dbe4f0] outline-none placeholder:text-[#858d9a]',
            className
          )}
          onChange={event => onValueChange(event.target.value)}
          {...props}
        />
        <span className="flex shrink-0 border-l border-[#2b3039]" data-cold-number-stepper-actions="true">
          <button
            type="button"
            disabled={disabled}
            data-cold-number-stepper-action="decrement"
            className="grid h-full w-8 place-items-center text-[#8f99ab] transition hover:bg-[#151b28] hover:text-[#f5f7fb] disabled:pointer-events-none"
            onClick={() => shift(-1)}
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{decrementLabel}</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            data-cold-number-stepper-action="increment"
            className="grid h-full w-8 place-items-center border-l border-[#2b3039] text-[#8f99ab] transition hover:bg-[#151b28] hover:text-[#f5f7fb] disabled:pointer-events-none"
            onClick={() => shift(1)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{incrementLabel}</span>
          </button>
        </span>
      </span>
    );
  }
);

NumberStepper.displayName = 'NumberStepper';

export { NumberStepper };
