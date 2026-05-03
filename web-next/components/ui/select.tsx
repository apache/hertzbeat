import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { HiddenInput } from './hidden-input';

export const coldSelectShellClassName = 'relative inline-flex min-w-0 max-w-full align-middle';

export const coldSelectTriggerClassName =
  'flex h-8 w-full min-w-[104px] appearance-none items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 py-1.5 pr-8 text-left text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-colors hover:border-[#3b4454] hover:bg-[#151b28] focus-visible:border-[#4e74f8] focus-visible:bg-[#151b28] focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)] disabled:cursor-not-allowed disabled:opacity-55';

export const coldSelectIconClassName =
  'pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8f99ab]';

const coldSelectListboxClassName =
  'fixed z-[90] min-w-[220px] overflow-y-auto rounded-[4px] border border-[#2b3039] bg-[#111318] p-1 text-[12px] font-semibold text-[#dbe4f0] shadow-[0_22px_60px_rgba(0,0,0,0.55)]';

type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled: boolean;
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
  defaultOpen?: boolean;
  onValueChange?: (value: string) => void;
}

function optionValueFromElement(option: React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>): string {
  const value = option.props.value;
  if (value !== undefined) return String(value);
  return React.Children.toArray(option.props.children).join('');
}

function extractOptions(children: React.ReactNode): SelectOption[] {
  return React.Children.toArray(children)
    .filter(React.isValidElement)
    .filter((child): child is React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>> => child.type === 'option')
    .map(option => ({
      value: optionValueFromElement(option),
      label: option.props.children,
      disabled: Boolean(option.props.disabled)
    }));
}

function findNextOption(options: SelectOption[], currentValue: string, direction: 1 | -1): SelectOption | null {
  if (options.length === 0) return null;
  const currentIndex = Math.max(0, options.findIndex(option => option.value === currentValue));
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (currentIndex + offset * direction + options.length) % options.length;
    const option = options[index];
    if (!option.disabled) return option;
  }
  return null;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      children,
      disabled,
      value,
      defaultValue,
      onChange,
      onValueChange,
      name,
      form,
      id,
      'aria-label': ariaLabel,
      defaultOpen = false,
      ...props
    },
    ref
  ) => {
    const options = React.useMemo(() => extractOptions(children), [children]);
    const fallbackValue = options.find(option => !option.disabled)?.value ?? '';
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(String(defaultValue ?? fallbackValue));
    const [open, setOpen] = React.useState(defaultOpen);
    const [listboxStyle, setListboxStyle] = React.useState<React.CSSProperties>({ position: 'fixed' });
    const shellRef = React.useRef<HTMLSpanElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const listboxRef = React.useRef<HTMLDivElement>(null);
    const generatedId = React.useId();
    const triggerId = id ?? `cold-select-${generatedId}`;
    const listboxId = `${triggerId}-listbox`;
    const selectedValue = String(isControlled ? value : internalValue);
    const selectedOption = options.find(option => option.value === selectedValue) ?? options.find(option => !option.disabled);

    const updateListboxGeometry = React.useCallback(() => {
      if (typeof window === 'undefined' || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportPadding = 12;
      const menuGap = 4;
      const menuMinWidth = 220;
      const menuMaxHeight = 320;
      const width = Math.max(menuMinWidth, rect.width);
      const availableBelow = Math.max(0, window.innerHeight - rect.bottom - viewportPadding - menuGap);
      const availableAbove = Math.max(0, rect.top - viewportPadding - menuGap);
      const placeAbove = availableBelow < 160 && availableAbove > availableBelow;
      const availableHeight = placeAbove ? availableAbove : availableBelow || menuMaxHeight;
      const maxHeight = Math.max(96, Math.min(menuMaxHeight, availableHeight));
      const maxLeft = Math.max(viewportPadding, window.innerWidth - viewportPadding - width);
      const left = Math.min(Math.max(viewportPadding, rect.left), maxLeft);
      const top = placeAbove
        ? Math.max(viewportPadding, rect.top - menuGap - maxHeight)
        : Math.max(viewportPadding, Math.min(rect.bottom + menuGap, window.innerHeight - viewportPadding - maxHeight));

      setListboxStyle({
        position: 'fixed',
        left,
        top,
        width,
        maxHeight
      });
    }, []);

    useIsomorphicLayoutEffect(() => {
      if (open) updateListboxGeometry();
    }, [open, updateListboxGeometry, options.length]);

    React.useEffect(() => {
      if (!open) return;
      const onPointerDown = (event: PointerEvent) => {
        const target = event.target as Node;
        if (!shellRef.current?.contains(target) && !listboxRef.current?.contains(target)) setOpen(false);
      };
      document.addEventListener('pointerdown', onPointerDown);
      return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    React.useEffect(() => {
      if (!open || typeof window === 'undefined') return;
      window.addEventListener('resize', updateListboxGeometry);
      window.addEventListener('scroll', updateListboxGeometry, true);
      return () => {
        window.removeEventListener('resize', updateListboxGeometry);
        window.removeEventListener('scroll', updateListboxGeometry, true);
      };
    }, [open, updateListboxGeometry]);

    const commitValue = React.useCallback(
      (nextValue: string) => {
        const nextOption = options.find(option => option.value === nextValue);
        if (!nextOption || nextOption.disabled || disabled) return;
        if (!isControlled) setInternalValue(nextValue);
        onValueChange?.(nextValue);
        onChange?.({
          target: { value: nextValue, name },
          currentTarget: { value: nextValue, name }
        } as React.ChangeEvent<HTMLSelectElement>);
        setOpen(false);
      },
      [disabled, isControlled, name, onChange, onValueChange, options]
    );

    const canUsePortal = typeof document !== 'undefined';
    const listbox = open ? (
      <div
        ref={listboxRef}
        id={listboxId}
        role="listbox"
        aria-labelledby={triggerId}
        data-cold-select-listbox="custom-menu"
        data-cold-select-layer="viewport-fixed"
        data-cold-select-portal={canUsePortal ? 'body-layer' : 'server-inline-fallback'}
        className={cn(coldSelectListboxClassName)}
        style={listboxStyle}
      >
        {options.map(option => {
          const selected = option.value === selectedOption?.value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={selected}
              disabled={option.disabled}
              data-cold-select-option={selected ? 'selected' : 'idle'}
              className={cn(
                'flex min-h-8 w-full items-center gap-2 rounded-[3px] px-2.5 text-left text-[12px] transition',
                selected ? 'bg-[#182238] text-[#f5f8ff]' : 'text-[#cbd5e1] hover:bg-[#151b28] hover:text-white',
                option.disabled ? 'cursor-not-allowed opacity-45' : ''
              )}
              onClick={() => commitValue(option.value)}
            >
              <span className="w-3 text-center text-[#dbe4f0]">{selected ? '✓' : ''}</span>
              <span className="min-w-0 truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    ) : null;

    return (
      <span
        ref={shellRef}
        data-cold-select-owner="cold-custom-select"
        className={cn(coldSelectShellClassName, disabled ? 'opacity-70' : null, containerClassName)}
      >
        <select
          ref={ref}
          aria-hidden="true"
          tabIndex={-1}
          disabled
          value={selectedOption?.value ?? selectedValue}
          data-cold-select-control="hidden-native"
          data-cold-select-native-disabled="label-activation-guard"
          className="hidden"
          onChange={() => undefined}
        >
          {children}
        </select>
        <HiddenInput
          name={disabled ? undefined : name}
          form={form}
          value={selectedOption?.value ?? selectedValue}
          data-cold-select-control="form-value"
        />
        <button
          {...props}
          ref={triggerRef}
          id={triggerId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={ariaLabel}
          disabled={disabled}
          data-cold-select-control="custom-trigger"
          className={cn(coldSelectTriggerClassName, className)}
          onClick={() => {
            if (!open) updateListboxGeometry();
            setOpen(current => !current);
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (!open) updateListboxGeometry();
              setOpen(current => !current);
              return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const next = findNextOption(options, selectedOption?.value ?? selectedValue, event.key === 'ArrowDown' ? 1 : -1);
              if (next) commitValue(next.value);
            }
          }}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? '-'}</span>
        </button>
        <ChevronDown data-cold-select-icon="chevron" className={cn(coldSelectIconClassName, open ? 'text-[#dbe4f0]' : null)} aria-hidden="true" />
        {listbox ? (canUsePortal ? createPortal(listbox, document.body) : listbox) : null}
      </span>
    );
  }
);

Select.displayName = 'Select';

export { Select };
