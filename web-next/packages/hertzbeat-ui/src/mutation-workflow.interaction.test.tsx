// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HzBatchToolbar, HzDangerConfirm, HzMutationBar } from './index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mutationRoot: Root | null = null;
let mutationContainer: HTMLDivElement | null = null;

afterEach(() => {
  if (mutationRoot) {
    act(() => {
      mutationRoot?.unmount();
    });
  }
  mutationRoot = null;
  mutationContainer?.remove();
  mutationContainer = null;
});

describe('mutation workflow primitives', () => {
  it('fires save, discard, dangerous confirm, and batch action callbacks', async () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    const onConfirm = vi.fn();
    const onBatchApply = vi.fn();
    mutationContainer = document.createElement('div');
    document.body.appendChild(mutationContainer);
    mutationRoot = createRoot(mutationContainer);

    function Demo() {
      const [dangerOpen, setDangerOpen] = React.useState(false);
      return (
        <div>
          <HzMutationBar
            title="Template changes"
            status="dirty"
            dirtyFields={['app.yml']}
            onSave={onSave}
            onDiscard={onDiscard}
          />
          <HzDangerConfirm
            open={dangerOpen}
            title="Reset YAML draft"
            triggerLabel="Reset draft"
            confirmLabel="Reset now"
            cancelLabel="Keep draft"
            onOpenChange={setDangerOpen}
            onConfirm={onConfirm}
          />
          <HzBatchToolbar
            selectionCount={2}
            actions={[{ id: 'apply', label: 'Apply', tone: 'info', onSelect: onBatchApply }]}
          />
        </div>
      );
    }

    await act(async () => {
      mutationRoot?.render(<Demo />);
      await Promise.resolve();
    });

    const save = mutationContainer.querySelector('[aria-label="Save Template changes"]') as HTMLElement | null;
    const discard = mutationContainer.querySelector('[aria-label="Discard Template changes"]') as HTMLElement | null;
    const openDanger = mutationContainer.querySelector('[aria-label="Open dangerous action Reset YAML draft"]') as HTMLElement | null;
    const batchApply = mutationContainer.querySelector('[data-hz-batch-action="apply"]') as HTMLElement | null;

    expect(save).not.toBeNull();
    expect(discard).not.toBeNull();
    expect(openDanger).not.toBeNull();
    expect(batchApply).not.toBeNull();

    await act(async () => {
      save?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      discard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      openDanger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      batchApply?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onBatchApply).toHaveBeenCalledTimes(1);
    expect(mutationContainer.querySelector('[data-hz-confirm-open="true"]')).not.toBeNull();

    const confirm = mutationContainer.querySelector('[aria-label="Confirm dangerous action Reset YAML draft"]') as HTMLElement | null;
    expect(confirm).not.toBeNull();

    await act(async () => {
      confirm?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('opens Angular-style batch overflow menus and closes after a menu action', async () => {
    const onEnable = vi.fn();
    mutationContainer = document.createElement('div');
    document.body.appendChild(mutationContainer);
    mutationRoot = createRoot(mutationContainer);

    await act(async () => {
      mutationRoot?.render(
        <HzBatchToolbar
          selectionCount={2}
          selectionLabel="monitors selected"
          overflowLabel="More monitor operations"
          actions={[
            { id: 'select-page', label: 'Select page' },
            { id: 'enable', label: 'Enable', presentation: 'menu', onSelect: onEnable },
            { id: 'pause', label: 'Pause', presentation: 'menu' }
          ]}
        />
      );
      await Promise.resolve();
    });

    const trigger = mutationContainer.querySelector('[data-hz-batch-overflow-trigger="angular-ellipsis-menu"]') as HTMLElement | null;
    const panel = mutationContainer.querySelector('[data-hz-batch-overflow-panel="angular-nz-dropdown-menu"]') as HTMLElement | null;
    const enable = mutationContainer.querySelector('[data-hz-batch-action="enable"]') as HTMLElement | null;

    expect(trigger).not.toBeNull();
    expect(panel?.getAttribute('data-hz-batch-overflow-panel-open')).toBe('false');
    expect(panel?.hasAttribute('hidden')).toBe(true);
    expect(enable?.getAttribute('data-hz-batch-action-presentation')).toBe('menu');

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.getAttribute('data-hz-batch-overflow-panel-open')).toBe('true');
    expect(panel?.hasAttribute('hidden')).toBe(false);

    await act(async () => {
      enable?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(panel?.getAttribute('data-hz-batch-overflow-panel-open')).toBe('false');
  });
});
