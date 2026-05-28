// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HzSelectMenu } from './index';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('HzSelectMenu interactions', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const originalInnerHeight = window.innerHeight;
  const originalInnerWidth = window.innerWidth;
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
      await Promise.resolve();
    });
    root = null;
    container?.remove();
    container = null;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('renders a fixed upward listbox when the trigger is near the viewport bottom', async () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    HTMLElement.prototype.getBoundingClientRect = vi.fn(function getBoundingClientRectMock(this: HTMLElement) {
      if (this.getAttribute('data-hz-ui') === 'select-menu') {
        return {
          bottom: 752,
          height: 32,
          left: 1024,
          right: 1120,
          top: 720,
          width: 96,
          x: 1024,
          y: 720,
          toJSON: () => ({})
        } as DOMRect;
      }
      return originalGetBoundingClientRect.call(this);
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <HzSelectMenu
          label="Page size"
          value="8"
          options={[
            { value: '8', label: '8' },
            { value: '20', label: '20' },
            { value: '50', label: '50' }
          ]}
        />
      );
      await Promise.resolve();
    });

    const trigger = container.querySelector('[data-hz-ui="select-trigger"]') as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const listbox = container.querySelector('[data-hz-ui="select-listbox"]') as HTMLDivElement | null;
    expect(listbox).not.toBeNull();
    expect(listbox?.getAttribute('data-hz-select-placement')).toBe('top');
    expect(listbox?.className).toContain('fixed');
    expect(listbox?.style.bottom).toBe('84px');
    expect(listbox?.style.left).toBe('1024px');
    expect(listbox?.style.minWidth).toBe('96px');
    expect(listbox?.textContent).toContain('20');
  });
});
