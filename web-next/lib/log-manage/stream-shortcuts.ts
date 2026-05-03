export type StreamShortcutIntent = 'newer' | 'older' | 'newer-page' | 'older-page' | 'latest' | 'clear-selection';

type EditableTarget = {
  tagName?: string;
  isContentEditable?: boolean;
  parentElement?: EditableTarget | null;
};

type StreamShortcutEventLike = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
  target: EventTarget | null;
};

export function isEditableStreamShortcutTarget(target: EventTarget | null) {
  let current = (target as EditableTarget | null) ?? null;

  while (current) {
    const tagName = current.tagName?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }
    if (current.isContentEditable) {
      return true;
    }
    current = current.parentElement ?? null;
  }

  return false;
}

export function resolveStreamShortcutIntent(event: StreamShortcutEventLike): StreamShortcutIntent | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) {
    return null;
  }

  if (isEditableStreamShortcutTarget(event.target)) {
    return null;
  }

  switch (event.key) {
    case 'ArrowUp':
    case 'k':
    case 'K':
      return 'newer';
    case 'PageUp':
      return 'newer-page';
    case 'ArrowDown':
    case 'j':
    case 'J':
      return 'older';
    case 'PageDown':
      return 'older-page';
    case 'Home':
      return 'latest';
    case 'Escape':
      return 'clear-selection';
    default:
      return null;
  }
}
