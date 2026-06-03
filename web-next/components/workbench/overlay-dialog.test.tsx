// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverlayDialog } from './overlay-dialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('overlay dialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('closes side drawers when the user clicks outside the temporary detail panel', async () => {
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <OverlayDialog open={true} title="Log detail" placement="right" onClose={onClose}>
          <button type="button">View trace</button>
        </OverlayDialog>
      );
      await Promise.resolve();
    });

    const overlay = container.querySelector('[data-overlay-dialog="true"]') as HTMLElement | null;
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('data-overlay-dialog-mask-closable')).toBe('true');

    await act(async () => {
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps side drawers open when the user interacts inside the panel', async () => {
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <OverlayDialog open={true} title="Trace detail" placement="right" onClose={onClose}>
          <button type="button">View logs</button>
        </OverlayDialog>
      );
      await Promise.resolve();
    });

    const overlay = container.querySelector('[data-overlay-dialog="true"]') as HTMLElement | null;
    const panel = overlay?.firstElementChild as HTMLElement | null;
    expect(panel).not.toBeNull();

    await act(async () => {
      panel?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not turn centered editor dialogs into click-away dialogs', async () => {
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <OverlayDialog open={true} title="Configure notice" onClose={onClose}>
          <input aria-label="Notice name" />
        </OverlayDialog>
      );
      await Promise.resolve();
    });

    const overlay = container.querySelector('[data-overlay-dialog="true"]') as HTMLElement | null;
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('data-overlay-dialog-mask-closable')).toBe('false');

    await act(async () => {
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('allows centered dialogs to explicitly preserve non-click-away modal semantics with route markers', async () => {
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <OverlayDialog
          open={true}
          title="Label management"
          onClose={onClose}
          maskClosable={false}
          overlayProps={{ 'data-label-dialog-mask-closable': 'false' }}
        >
          <input aria-label="Label name" />
        </OverlayDialog>
      );
      await Promise.resolve();
    });

    const overlay = container.querySelector('[data-overlay-dialog="true"]') as HTMLElement | null;
    expect(overlay?.getAttribute('data-overlay-dialog-mask-closable')).toBe('false');
    expect(overlay?.getAttribute('data-label-dialog-mask-closable')).toBe('false');

    await act(async () => {
      overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
