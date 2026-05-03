import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { HiddenInput } from './hidden-input';

function parseTags(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function stringifyTags(tags: string[]) {
  return tags.join(', ');
}

type PopoverMetrics = {
  left: number;
  top: number;
  width: number;
};

export interface TagInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
  suggestions?: string[];
  maxSuggestions?: number;
}

const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  ({ className, containerClassName, disabled, name, value, onValueChange, placeholder, suggestions = [], maxSuggestions = 8, ...props }, ref) => {
    const tags = React.useMemo(() => parseTags(value), [value]);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [draft, setDraft] = React.useState('');
    const [focused, setFocused] = React.useState(false);
    const [popoverMetrics, setPopoverMetrics] = React.useState<PopoverMetrics | null>(null);
    const visibleSuggestions = React.useMemo(() => {
      const normalizedDraft = draft.trim().toLowerCase();
      return [...new Set(suggestions)]
        .filter(suggestion => suggestion.trim())
        .filter(suggestion => !tags.includes(suggestion))
        .filter(suggestion => !normalizedDraft || suggestion.toLowerCase().includes(normalizedDraft))
        .slice(0, maxSuggestions);
    }, [draft, maxSuggestions, suggestions, tags]);

    function commitDraft() {
      const nextTags = parseTags(draft);
      if (nextTags.length === 0) return;
      const merged = [...tags];
      nextTags.forEach(tag => {
        if (!merged.includes(tag)) merged.push(tag);
      });
      setDraft('');
      onValueChange(stringifyTags(merged));
    }

    function removeTag(tag: string) {
      onValueChange(stringifyTags(tags.filter(item => item !== tag)));
    }

    function appendSuggestion(tag: string) {
      if (tags.includes(tag)) return;
      setDraft('');
      onValueChange(stringifyTags([...tags, tag]));
    }

    function setDraftInput(node: HTMLInputElement | null) {
      inputRef.current = node;
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

    const popoverStyle = popoverMetrics
      ? {
          left: popoverMetrics.left,
          top: popoverMetrics.top,
          width: popoverMetrics.width
        }
      : undefined;

    return (
      <div
        data-cold-tag-input-owner="cold-tag-input"
        data-cold-tag-input-mode={suggestions.length > 0 ? 'searchable-tags' : 'freeform-tags'}
        className={cn(
          'relative flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus-within:border-[#4e74f8] focus-within:ring-2 focus-within:ring-[rgba(78,116,248,0.12)]',
          disabled ? 'opacity-55' : '',
          containerClassName
        )}
      >
        <HiddenInput name={disabled ? undefined : name} value={value} data-cold-tag-input-value="hidden" />
        {tags.map(tag => (
          <span
            key={tag}
            data-cold-tag-chip={tag}
            className="inline-flex h-6 max-w-full items-center gap-1 rounded-[3px] border border-[#394150] bg-[#151923] pl-2 pr-1 text-[12px] font-semibold text-[#dbe4f0]"
          >
            <span className="min-w-0 truncate">{tag}</span>
            <button
              type="button"
              disabled={disabled}
              data-cold-tag-remove={tag}
              className="grid h-4 w-4 place-items-center rounded-[2px] text-[#8f99ab] transition hover:bg-[#202838] hover:text-[#f5f7fb] disabled:pointer-events-none"
              aria-label={`删除 ${tag}`}
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={setDraftInput}
          type="text"
          disabled={disabled}
          value={draft}
          data-cold-tag-input-control="draft"
          className={cn(
            'h-6 min-w-[120px] flex-1 border-0 bg-transparent px-1 text-[12px] font-semibold text-[#dbe4f0] outline-none placeholder:text-[#858d9a]',
            className
          )}
          placeholder={tags.length === 0 ? placeholder : '添加标签'}
          onChange={event => {
            setDraft(event.target.value);
            positionPopover(event.currentTarget);
          }}
          onFocus={event => {
            setFocused(true);
            positionPopover(event.currentTarget);
          }}
          onBlur={() => {
            commitDraft();
            globalThis.setTimeout(() => setFocused(false), 120);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commitDraft();
            }
          }}
          {...props}
        />
        {focused && visibleSuggestions.length > 0 ? (
          <div
            data-cold-tag-suggestions-owner="cold-search-popover"
            data-cold-tag-suggestions-position="fixed-anchored"
            className="fixed z-[80] max-h-40 overflow-y-auto rounded-[3px] border border-[#303743] bg-[#0d1017] p-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.36)]"
            style={popoverStyle}
          >
            {visibleSuggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                disabled={disabled}
                data-cold-tag-suggestion={suggestion}
                className="flex h-7 w-full items-center rounded-[3px] px-2 text-left text-[12px] font-semibold text-[#a9b7cc] transition hover:bg-[#182238] hover:text-white disabled:pointer-events-none"
                onMouseDown={event => event.preventDefault()}
                onClick={() => appendSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }
);

TagInput.displayName = 'TagInput';

export { TagInput, parseTags as parseTagInputValue };
