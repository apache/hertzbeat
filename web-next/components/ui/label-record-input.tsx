import * as React from 'react';
import { Plus, X } from 'lucide-react';
import type { AlertLabelOptions } from '../../lib/alert-label-options';
import { DEFAULT_ALERT_LABEL_OPTIONS } from '../../lib/alert-label-options';
import { cn } from '../../lib/utils';
import { HiddenInput } from './hidden-input';

type LabelRecord = {
  key: string;
  value: string;
};

type PopoverMetrics = {
  left: number;
  top: number;
  width: number;
};

type ActivePicker = {
  row: 'draft' | number;
  type: 'key' | 'value';
} | null;

function parseLabelRecords(value: string): LabelRecord[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const [key, ...rest] = item.split(':');
      return {
        key: key.trim(),
        value: rest.join(':').trim()
      };
    })
    .filter(item => item.key);
}

function stringifyLabelRecords(records: LabelRecord[]) {
  return records
    .filter(record => record.key.trim())
    .map(record => {
      const key = record.key.trim();
      const value = record.value.trim();
      return value ? `${key}:${value}` : key;
    })
    .join(', ');
}

function filterSuggestions(values: string[], query: string, limit = 8) {
  const normalized = query.trim().toLowerCase();
  return [...new Set(values)]
    .filter(value => value && (!normalized || value.toLowerCase().includes(normalized)))
    .slice(0, limit);
}

export interface LabelRecordInputProps {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
  labelOptions?: AlertLabelOptions;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
  removeLabel?: string;
  containerClassName?: string;
}

export const LabelRecordInput = React.forwardRef<HTMLInputElement, LabelRecordInputProps>(
  (
    {
      value,
      onValueChange,
      name,
      disabled,
      labelOptions = DEFAULT_ALERT_LABEL_OPTIONS,
      keyPlaceholder = '标签名',
      valuePlaceholder = '标签值',
      addLabel = '添加',
      removeLabel = '删除',
      containerClassName
    },
    ref
  ) => {
    const records = React.useMemo(() => parseLabelRecords(value), [value]);
    const keyInputRef = React.useRef<HTMLInputElement | null>(null);
    const valueInputRef = React.useRef<HTMLInputElement | null>(null);
    const rowValueRefs = React.useRef(new Map<number, HTMLInputElement | null>());
    const [draftKey, setDraftKey] = React.useState('');
    const [draftValue, setDraftValue] = React.useState('');
    const [activePicker, setActivePicker] = React.useState<ActivePicker>(null);
    const [popoverMetrics, setPopoverMetrics] = React.useState<PopoverMetrics | null>(null);

    function getValuePool(key: string) {
      return key.trim() ? labelOptions.valuesByKey[key.trim()] || [] : Object.values(labelOptions.valuesByKey).flat();
    }

    function updateRecord(index: number, nextRecord: LabelRecord) {
      const nextRecords = records.map((record, recordIndex) => (recordIndex === index ? nextRecord : record));
      onValueChange(stringifyLabelRecords(nextRecords));
    }

    function updateRecordKey(index: number, key: string) {
      updateRecord(index, { key, value: '' });
    }

    function updateRecordValue(index: number, recordValue: string) {
      updateRecord(index, { ...records[index], value: recordValue });
    }

    function commitRecord(nextKey = draftKey, nextValue = draftValue) {
      const key = nextKey.trim();
      const recordValue = nextValue.trim();
      if (!key) return;
      const merged = records.filter(record => record.key !== key);
      merged.push({ key, value: recordValue || key });
      setDraftKey('');
      setDraftValue('');
      onValueChange(stringifyLabelRecords(merged));
    }

    function removeRecord(index: number) {
      onValueChange(stringifyLabelRecords(records.filter((_, recordIndex) => recordIndex !== index)));
    }

    function setKeyInput(node: HTMLInputElement | null) {
      keyInputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }

    function positionPopover(anchor: HTMLInputElement | null) {
      if (!anchor || typeof window === 'undefined') return;
      const rect = anchor.getBoundingClientRect();
      const gutter = 16;
      const popoverHeight = 164;
      const maxWidth = Math.max(160, window.innerWidth - gutter * 2);
      const width = Math.min(Math.max(rect.width, 240), 360, maxWidth);
      const left = Math.min(Math.max(rect.left, gutter), Math.max(gutter, window.innerWidth - width - gutter));
      const belowTop = rect.bottom + 4;
      const top = belowTop + popoverHeight > window.innerHeight - gutter ? Math.max(gutter, rect.top - popoverHeight - 4) : belowTop;
      setPopoverMetrics({ left, top, width });
    }

    function showPicker(picker: NonNullable<ActivePicker>, anchor: HTMLInputElement | null) {
      setActivePicker(picker);
      positionPopover(anchor);
    }

    function hidePicker() {
      globalThis.setTimeout(() => setActivePicker(null), 120);
    }

    const popoverStyle = popoverMetrics
      ? {
          left: popoverMetrics.left,
          top: popoverMetrics.top,
          width: popoverMetrics.width
        }
      : undefined;

    function renderRow({
      row,
      record,
      index
    }: {
      row: 'draft' | number;
      record: LabelRecord;
      index?: number;
    }) {
      const isDraft = row === 'draft';
      const label = `${record.key}:${record.value}`;
      const keySuggestions = filterSuggestions(labelOptions.keys, record.key);
      const valueSuggestions = filterSuggestions(getValuePool(record.key), record.value);
      const keyPopoverOpen = activePicker?.row === row && activePicker.type === 'key' && keySuggestions.length > 0;
      const valuePopoverOpen = activePicker?.row === row && activePicker.type === 'value' && valueSuggestions.length > 0;

      return (
        <div
          key={isDraft ? 'draft' : `${index}-${label}`}
          data-cold-label-selector-row-layout="full-row-equal-key-value-with-action"
          data-cold-label-selector-record-row={!isDraft ? label : undefined}
          data-cold-label-selector-draft-row={isDraft ? 'true' : undefined}
          className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_14px_minmax(0,1fr)_76px] items-center gap-2"
        >
          <div className="relative min-w-0">
            <input
              ref={node => {
                if (isDraft) setKeyInput(node);
              }}
              type="text"
              disabled={disabled}
              value={record.key}
              data-cold-label-selector-key-input="searchable-key"
              className="h-8 w-full rounded-[3px] border border-[#2b3039] bg-[#0d0f14] px-2 text-[12px] font-semibold text-[#dbe4f0] outline-none placeholder:text-[#858d9a] focus:border-[#4e74f8]"
              placeholder={keyPlaceholder}
              onFocus={event => showPicker({ row, type: 'key' }, event.currentTarget)}
              onBlur={hidePicker}
              onChange={event => {
                if (isDraft) {
                  setDraftKey(event.target.value);
                } else if (typeof index === 'number') {
                  updateRecordKey(index, event.target.value);
                }
                positionPopover(event.currentTarget);
              }}
              onKeyDown={event => {
                if (event.key === 'Enter' && isDraft && draftValue.trim()) {
                  event.preventDefault();
                  commitRecord();
                }
              }}
            />
            {keyPopoverOpen ? (
              <div
                data-cold-label-selector-popover="keys"
                data-cold-label-selector-popover-position="fixed-anchored"
                className="fixed z-[80] max-h-40 overflow-y-auto rounded-[3px] border border-[#303743] bg-[#0d1017] p-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.36)]"
                style={popoverStyle}
              >
                {keySuggestions.map(option => (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    data-cold-label-selector-suggestion={option}
                    className="flex h-7 w-full items-center rounded-[3px] px-2 text-left text-[12px] font-semibold text-[#a9b7cc] transition hover:bg-[#182238] hover:text-white disabled:pointer-events-none"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                      if (isDraft) {
                        setDraftKey(option);
                        setDraftValue('');
                        setActivePicker({ row, type: 'value' });
                        globalThis.setTimeout(() => {
                          valueInputRef.current?.focus();
                          positionPopover(valueInputRef.current);
                        }, 0);
                      } else if (typeof index === 'number') {
                        updateRecordKey(index, option);
                        setActivePicker({ row, type: 'value' });
                        globalThis.setTimeout(() => {
                          const nextInput = rowValueRefs.current.get(index) ?? null;
                          nextInput?.focus();
                          positionPopover(nextInput);
                        }, 0);
                      }
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <span className="text-center text-[12px] font-semibold text-[#7e8494]">:</span>
          <div className="relative min-w-0">
            <input
              ref={node => {
                if (isDraft) {
                  valueInputRef.current = node;
                } else if (typeof index === 'number') {
                  rowValueRefs.current.set(index, node);
                }
              }}
              type="text"
              disabled={disabled}
              value={record.value}
              data-cold-label-selector-value-input="searchable-value"
              className="h-8 w-full rounded-[3px] border border-[#2b3039] bg-[#0d0f14] px-2 text-[12px] font-semibold text-[#dbe4f0] outline-none placeholder:text-[#858d9a] focus:border-[#4e74f8]"
              placeholder={valuePlaceholder}
              onFocus={event => showPicker({ row, type: 'value' }, event.currentTarget)}
              onBlur={hidePicker}
              onChange={event => {
                if (isDraft) {
                  setDraftValue(event.target.value);
                } else if (typeof index === 'number') {
                  updateRecordValue(index, event.target.value);
                }
                positionPopover(event.currentTarget);
              }}
              onKeyDown={event => {
                if (event.key === 'Enter' && isDraft) {
                  event.preventDefault();
                  commitRecord();
                }
              }}
            />
            {valuePopoverOpen ? (
              <div
                data-cold-label-selector-popover="values"
                data-cold-label-selector-popover-position="fixed-anchored"
                className="fixed z-[80] max-h-40 overflow-y-auto rounded-[3px] border border-[#303743] bg-[#0d1017] p-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.36)]"
                style={popoverStyle}
              >
                {valueSuggestions.map(option => (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    data-cold-label-selector-suggestion={option}
                    className="flex h-7 w-full items-center rounded-[3px] px-2 text-left text-[12px] font-semibold text-[#a9b7cc] transition hover:bg-[#182238] hover:text-white disabled:pointer-events-none"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                      if (isDraft) {
                        if (draftKey.trim()) {
                          commitRecord(draftKey, option);
                        } else {
                          setDraftValue(option);
                        }
                      } else if (typeof index === 'number') {
                        updateRecordValue(index, option);
                        setActivePicker(null);
                      }
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {isDraft ? (
            <button
              type="button"
              disabled={disabled || !draftKey.trim()}
              data-cold-label-selector-add="true"
              className="inline-flex h-8 w-[76px] min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 text-[12px] font-semibold text-[#dbe4f0] transition hover:border-[#4e74f8] hover:bg-[#151b28] disabled:pointer-events-none disabled:opacity-45"
              onClick={() => commitRecord()}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {addLabel}
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              data-cold-label-selector-remove-row={label}
              className="inline-flex h-8 w-[76px] min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 text-[12px] font-semibold text-[#dbe4f0] transition hover:border-[#4e74f8] hover:bg-[#151b28] disabled:pointer-events-none disabled:opacity-45"
              aria-label={`${removeLabel} ${label}`}
              onClick={() => {
                if (typeof index === 'number') removeRecord(index);
              }}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {removeLabel}
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        data-cold-label-selector-owner="cold-label-selector"
        data-cold-label-selector-shell="unframed-inline"
        className={cn(
          'space-y-2',
          disabled ? 'opacity-55' : '',
          containerClassName
        )}
      >
        <HiddenInput name={disabled ? undefined : name} value={value} data-cold-label-selector-value="hidden" />
        {records.map((record, index) => renderRow({ row: index, record, index }))}
        {renderRow({ row: 'draft', record: { key: draftKey, value: draftValue } })}
      </div>
    );
  }
);

LabelRecordInput.displayName = 'LabelRecordInput';

export { parseLabelRecords };
