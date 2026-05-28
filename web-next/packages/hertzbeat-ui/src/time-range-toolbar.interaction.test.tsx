// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { HzTimeRangeToolbar } from './index';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('HzTimeRangeToolbar interactions', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
      await Promise.resolve();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it('removes a saved custom time range from the shared picker', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <HzTimeRangeToolbar
          value={{ from: 'now-1h', to: 'now', refresh: '30', tz: 'Asia/Shanghai' }}
          timeRangePickerMode="single"
          absoluteInputMode="datetime-local"
          railLayout="nowrap"
          timePickerDefaultOpen
          customRanges={[
            {
              id: 'release-window',
              label: 'Release window',
              from: 'now-2h',
              to: 'now',
              refresh: '30',
              tz: 'Asia/Shanghai'
            }
          ]}
          customStorageKey="hertzbeat.test.timeRange.custom"
          labels={{ deleteCustomRange: 'Delete' }}
        />
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[data-hz-expression-time-range-custom-range-row="release-window"]')).not.toBeNull();

    const deleteButton = container.querySelector(
      '[data-hz-expression-time-range-custom-range-delete="release-window"]'
    ) as HTMLButtonElement | null;
    expect(deleteButton).not.toBeNull();

    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('[data-hz-expression-time-range-custom-range-row="release-window"]')).toBeNull();
  });

  it('keeps the expression picker blur handler scoped to its own pointer guard', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <HzTimeRangeToolbar
          value={{ from: '2026-05-01T22:53:47', to: '2026-05-23T23:53:57', refresh: '', tz: 'Asia/Shanghai' }}
          timeRangePickerMode="single"
          absoluteInputMode="datetime-local"
          railLayout="nowrap"
          timePickerDefaultOpen
        />
      );
      await Promise.resolve();
    });

    const picker = container.querySelector('[data-hz-ui="expression-time-range-picker"]') as HTMLDivElement | null;
    expect(picker).not.toBeNull();

    await expect(
      act(async () => {
        picker?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
        await Promise.resolve();
      })
    ).resolves.toBeUndefined();
  });
});
