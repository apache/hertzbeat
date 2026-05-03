import { describe, expect, it } from 'vitest';
import { isEditableStreamShortcutTarget, resolveStreamShortcutIntent } from './stream-shortcuts';

describe('stream shortcut helpers', () => {
  it('maps investigation hotkeys to stream intents', () => {
    expect(resolveStreamShortcutIntent({ key: 'ArrowUp', target: null })).toBe('newer');
    expect(resolveStreamShortcutIntent({ key: 'k', target: null })).toBe('newer');
    expect(resolveStreamShortcutIntent({ key: 'ArrowDown', target: null })).toBe('older');
    expect(resolveStreamShortcutIntent({ key: 'J', target: null })).toBe('older');
    expect(resolveStreamShortcutIntent({ key: 'PageUp', target: null })).toBe('newer-page');
    expect(resolveStreamShortcutIntent({ key: 'PageDown', target: null })).toBe('older-page');
    expect(resolveStreamShortcutIntent({ key: 'Home', target: null })).toBe('latest');
    expect(resolveStreamShortcutIntent({ key: 'Escape', target: null })).toBe('clear-selection');
  });

  it('ignores shortcuts while typing or when modifier keys are pressed', () => {
    expect(resolveStreamShortcutIntent({ key: 'ArrowUp', target: { tagName: 'INPUT' } as unknown as EventTarget })).toBeNull();
    expect(resolveStreamShortcutIntent({ key: 'ArrowDown', ctrlKey: true, target: null })).toBeNull();
    expect(resolveStreamShortcutIntent({ key: 'Home', metaKey: true, target: null })).toBeNull();
    expect(resolveStreamShortcutIntent({ key: 'Escape', isComposing: true, target: null })).toBeNull();
  });

  it('detects editable targets through parent ancestry', () => {
    const contentEditableParent = { isContentEditable: true, parentElement: null };
    const nestedChild = { parentElement: contentEditableParent };

    expect(isEditableStreamShortcutTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
    expect(isEditableStreamShortcutTarget(nestedChild as unknown as EventTarget)).toBe(true);
    expect(isEditableStreamShortcutTarget({ tagName: 'DIV', parentElement: null } as unknown as EventTarget)).toBe(false);
  });
});
