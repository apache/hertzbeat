// @vitest-environment jsdom

import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TIME_CONTEXT_PRESETS } from '../../lib/time-context';
import { buildTimeRangeControlLabels, TimeRangeControl } from './time-range-control';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
  }
  root = null;
  container?.remove();
  container = null;
});

function renderInteractive(element: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(element);
  });
  return container;
}

function inputValue(input: HTMLInputElement, value: string) {
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('TimeRangeControl', () => {
  it('keeps action states accessible through the shared localized label helper', () => {
    const messages: Record<string, string> = {
      'time.range.preset': 'Time range',
      'time.range.relative': 'Relative',
      'time.range.start': 'Start',
      'time.range.end': 'End',
      'time.range.refresh': 'Refresh interval',
      'time.range.manual-refresh': 'Manual',
      'time.range.live': 'Live',
      'time.range.live-on': 'Pause live updates',
      'time.range.live-off': 'Resume live updates',
      'time.range.preset.last-30m': 'Last 30 minutes',
      'time.range.preset.last-1h': 'Last 1 hour',
      'time.range.preset.last-6h': 'Last 6 hours',
      'time.range.preset.last-1d': 'Last 1 day',
      'time.range.preset.last-1w': 'Last 1 week',
      'time.range.preset.last-4w': 'Last 4 weeks',
      'time.range.preset.last-12w': 'Last 12 weeks',
      'time.range.timezone': 'Timezone',
      'time.range.local-timezone': 'Local timezone',
      'time.range.apply': 'Apply',
      'time.range.apply-aria': 'Apply time range',
      'time.range.refresh-action': 'Refresh now',
      'time.range.reset': 'Reset',
      'time.range.reset-aria': 'Reset time range',
      'time.range.relative-placeholder': '45m'
    };
    const t = (key: string) => messages[key] || key;

    const html = renderToStaticMarkup(
      <TimeRangeControl
        value={{ timeRange: 'last-1h', refresh: '', live: 'false', tz: '' }}
        labels={buildTimeRangeControlLabels(t)}
        onApply={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-time-range-control-labels="localized"');
    expect(html).toContain('aria-label="Time range"');
    expect(html).toContain('aria-label="Resume live updates"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Apply time range"');
    expect(html).toContain('aria-label="Refresh now"');
    expect(html).toContain('aria-label="Reset time range"');
    expect(html).toContain('Last 30 minutes');
    expect(html).toContain('Last 1 hour');
    expect(html).toContain('Manual');
    expect(html).not.toMatch(/\u8fd1 30 \u5206\u949f/);
    expect(html).not.toMatch(/\u76f8\u5bf9/);
    expect(html).not.toMatch(/\u5237\u65b0/);
  });

  it('localizes provided preset values when a route passes custom preset options', () => {
    const messages: Record<string, string> = {
      'time.range.preset': 'Time range',
      'time.range.relative': 'Relative',
      'time.range.start': 'Start',
      'time.range.end': 'End',
      'time.range.refresh': 'Refresh interval',
      'time.range.manual-refresh': 'Manual',
      'time.range.live': 'Live',
      'time.range.live-on': 'Pause live updates',
      'time.range.live-off': 'Resume live updates',
      'time.range.preset.last-30m': 'Last 30 minutes',
      'time.range.preset.last-1h': 'Last 1 hour',
      'time.range.timezone': 'Timezone',
      'time.range.local-timezone': 'Local timezone',
      'time.range.apply': 'Apply',
      'time.range.apply-aria': 'Apply time range',
      'time.range.refresh-action': 'Refresh now',
      'time.range.reset': 'Reset',
      'time.range.reset-aria': 'Reset time range',
      'time.range.relative-placeholder': '45m'
    };
    const t = (key: string) => messages[key] || key;

    const html = renderToStaticMarkup(
      <TimeRangeControl
        value={{ timeRange: 'last-1h', refresh: '', live: 'false', tz: '' }}
        labels={buildTimeRangeControlLabels(t)}
        presets={[
          { value: 'last-30m', label: '\u8fd1 30 \u5206\u949f' },
          { value: 'last-1h', label: '\u8fd1 1 \u5c0f\u65f6' }
        ]}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('Last 30 minutes');
    expect(html).toContain('Last 1 hour');
    expect(html).not.toMatch(/\u8fd1 30 \u5206\u949f/);
    expect(html).not.toMatch(/\u8fd1 1 \u5c0f\u65f6/);
  });

  it('renders the shared HertzBeat UI operator toolbar without becoming another card layer', () => {
    const html = renderToStaticMarkup(
      <TimeRangeControl
        value={{ timeRange: 'last-1h', refresh: '30', live: 'false', tz: 'Asia/Shanghai' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-hz-ui="time-range-control"');
    expect(html).toContain('data-hz-time-range-control-owner="hertzbeat-ui-time-range-control"');
    expect(html).toContain('data-time-range-control="hertzbeat-shared"');
    expect(html).toContain('data-time-range-control-visual="hertzbeat-ui-operator-toolbar"');
    expect(html).toContain('data-time-range-control-density="compact"');
    expect(html).toContain('data-time-range-control-layout="single-row-rail"');
    expect(html).toContain('data-time-range-control-field-labels="sr-only"');
    expect(html).toContain('data-time-range-control-default-fields="collapsed"');
    expect(html).toContain('data-time-range-control-state="applied"');
    expect(html).toContain('data-time-range-preset-select="true"');
    expect(html).not.toContain('data-time-range-relative-input="true"');
    expect(html).not.toContain('data-time-range-start-input="true"');
    expect(html).not.toContain('data-time-range-end-input="true"');
    expect(html).toContain('data-time-range-refresh-select="true"');
    expect(html).toContain('data-time-range-live-toggle="paused"');
    expect(html).toContain('data-time-range-timezone-select="true"');
    expect(html).toContain('data-time-range-apply-action="true"');
    expect(html).toContain('data-time-range-reset-action="true"');
    expect(html).toContain('bg-[var(--ops-surface-panel)]');
    expect(html).toContain('rounded-[3px]');
    expect(html).not.toContain('flex-col gap-1 text-[10px] font-medium uppercase');
    expect(html).not.toContain('min-w-[142px] flex-col');
    expect(html).not.toContain('rounded-xl');
    expect(html).not.toContain('This control');
    expect(html).not.toContain('placeholder="45m"');
    expect(html).not.toContain('placeholder="Start"');
    expect(html).not.toContain('placeholder="End"');

    TIME_CONTEXT_PRESETS.forEach(preset => {
      expect(html).toContain(`data-time-range-preset-option="${preset.value}"`);
    });
  });

  it('keeps chart-zoom absolute drafts visible without turning the control into a large form', () => {
    const html = renderToStaticMarkup(
      <TimeRangeControl
        value={{ timeRange: 'last-1h', start: '1713200000000', end: '1713203600000', refresh: '30', live: 'false' }}
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-time-range-control-layout="single-row-rail"');
    expect(html).toContain('data-time-range-control-absolute-draft="visible"');
    expect(html).toContain('data-time-range-control-default-fields="expanded"');
    expect(html).toContain('data-time-range-absolute-input-format="local-datetime"');
    expect(html).toContain('inputMode="text"');
    expect(html).toContain('value="2024-04-16 00:53:20"');
    expect(html).toContain('value="2024-04-16 01:53:20"');
    expect(html).not.toContain('value="1713200000000"');
    expect(html).not.toContain('value="1713203600000"');
    expect(html).not.toContain('w-[150px] flex-col gap-1');
  });

  it('can expose compact manual absolute inputs before chart zoom creates a draft', () => {
    const onApply = vi.fn();
    const staticHtml = renderToStaticMarkup(
      <TimeRangeControl
        value={{ timeRange: 'last-30m', refresh: '', live: 'false', tz: '' }}
        showAbsoluteFields
        onApply={onApply}
      />
    );

    expect(staticHtml).toContain('data-time-range-control-manual-entry="visible"');
    expect(staticHtml).toContain('data-time-range-control-absolute-draft="ready"');
    expect(staticHtml).toContain('data-time-range-control-default-fields="expanded"');
    expect(staticHtml).toContain('data-time-range-absolute-inputs="manual-entry"');
    expect(staticHtml).toContain('data-time-range-start-input="true"');
    expect(staticHtml).toContain('data-time-range-end-input="true"');

    const node = renderInteractive(
      <TimeRangeControl
        value={{ timeRange: 'last-30m', refresh: '30', live: 'false', tz: 'Asia/Shanghai' }}
        showAbsoluteFields
        onApply={onApply}
      />
    );

    inputValue(node.querySelector('[data-time-range-start-input="true"]') as HTMLInputElement, '2024-04-16 00:53:20');
    inputValue(node.querySelector('[data-time-range-end-input="true"]') as HTMLInputElement, '2024-04-16 01:53:20');

    act(() => {
      (node.querySelector('[data-time-range-apply-action="true"]') as HTMLButtonElement).click();
    });

    expect(onApply).toHaveBeenCalledWith({
      timeRange: 'last-30m',
      start: '1713200000000',
      end: '1713203600000',
      live: 'false',
      tz: 'Asia/Shanghai'
    });
  });

  it('still accepts epoch millis when an operator pastes route-safe absolute values', () => {
    const onApply = vi.fn();
    const node = renderInteractive(
      <TimeRangeControl
        value={{ timeRange: 'last-30m', refresh: '30', live: 'false', tz: 'Asia/Shanghai' }}
        showAbsoluteFields
        onApply={onApply}
      />
    );

    inputValue(node.querySelector('[data-time-range-start-input="true"]') as HTMLInputElement, '1713200000000');
    inputValue(node.querySelector('[data-time-range-end-input="true"]') as HTMLInputElement, '1713203600000');

    act(() => {
      (node.querySelector('[data-time-range-apply-action="true"]') as HTMLButtonElement).click();
    });

    expect(onApply).toHaveBeenCalledWith({
      timeRange: 'last-30m',
      start: '1713200000000',
      end: '1713203600000',
      live: 'false',
      tz: 'Asia/Shanghai'
    });
  });

  it('can render manual absolute entry as a Grafana-like narrow rail instead of a card', () => {
    const html = renderToStaticMarkup(
      <TimeRangeControl
        value={{ timeRange: 'last-30m', refresh: '', live: 'false', tz: '' }}
        showAbsoluteFields
        variant="narrow-rail"
        onApply={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-time-range-control-visual="grafana-like-narrow-rail"');
    expect(html).toContain('data-time-range-control-layout="nowrap-top-right-rail"');
    expect(html).toContain('data-time-range-control-align="end"');
    expect(html).toContain('data-time-range-control-wrap="nowrap"');
    expect(html).toContain('data-time-range-control-card="false"');
    expect(html).toContain('data-time-range-control-density="narrow"');
    expect(html).toContain('data-time-range-control-overflow="fit-without-scroll"');
    expect(html).toContain('data-time-range-control-absolute-display="local-seconds"');
    expect(html).toContain('data-time-range-control-manual-entry="visible"');
    expect(html).toContain('data-time-range-control-absolute-draft="ready"');
    expect(html).toContain('data-time-range-control-default-fields="expanded"');
    expect(html).toContain('data-time-range-absolute-inputs="manual-entry"');
    expect(html).toContain('data-time-range-start-input="true"');
    expect(html).toContain('data-time-range-end-input="true"');
    expect(html).toContain('flex-nowrap');
    expect(html).toContain('justify-end');
    expect(html).not.toContain('overflow-x-auto');
    expect(html).not.toContain('flex-wrap items-center gap-1.5 rounded-[3px] border');
    expect(html).not.toContain('bg-[var(--ops-surface-panel)] px-2 py-1');
  });

  it('keeps narrow absolute drafts readable without millisecond clipping', () => {
    const html = renderToStaticMarkup(
      <TimeRangeControl
        value={{ timeRange: 'last-30m', start: '1713200000123', end: '1713203600456', refresh: '30', live: 'false', tz: 'Asia/Shanghai' }}
        showAbsoluteFields
        variant="narrow-rail"
        onApply={() => undefined}
      />
    );

    expect(html).toContain('data-time-range-control-overflow="fit-without-scroll"');
    expect(html).toContain('data-time-range-control-absolute-display="local-seconds"');
    expect(html).toContain('value="2024-04-16 00:53:20"');
    expect(html).toContain('value="2024-04-16 01:53:20"');
    expect(html).not.toContain('00:53:20.123');
    expect(html).not.toContain('01:53:20.456');
  });

  it('keeps the narrow rail refresh selector wide enough to show the manual label', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/observability/time-range-control.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <TimeRangeControl
        value={{ timeRange: 'last-30m', refresh: '', live: 'false', tz: 'Asia/Shanghai' }}
        labels={{ manualRefresh: '\u624b\u52a8' }}
        showAbsoluteFields
        variant="narrow-rail"
        onApply={() => undefined}
      />
    );

    expect(source).toContain("data-time-range-refresh-field-fit=\"full-manual-label\"");
    expect(source).toContain("const refreshFrameClass = isNarrowRail ? 'w-[96px]' : 'w-[98px]'");
    expect(source).toContain("const refreshSelectWidth = isNarrowRail ? 'w-[64px]' : 'w-[64px]'");
    expect(html).toContain('data-time-range-refresh-field-fit="full-manual-label"');
    expect(html).toContain('data-time-range-refresh-select="true"');
    expect(html).toContain('\u624b\u52a8');
    expect(html).toContain('w-[96px]');
    expect(html).toContain('w-[64px]');
    expect(html).not.toContain("const refreshFrameClass = isNarrowRail ? 'w-[82px]'");
    expect(html).not.toContain("const refreshSelectWidth = isNarrowRail ? 'w-[48px]'");
  });

  it('keeps the time apply action visually neutral like the query run action', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/observability/time-range-control.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <TimeRangeControl
        value={{ timeRange: 'last-30m', refresh: '', live: 'false', tz: 'Asia/Shanghai' }}
        labels={{ apply: '\u5e94\u7528', applyAria: '\u5e94\u7528\u65f6\u95f4\u8303\u56f4' }}
        showAbsoluteFields
        variant="narrow-rail"
        onApply={() => undefined}
      />
    );

    expect(source).toContain('data-time-range-apply-visual="neutral-query-action"');
    expect(source).toContain("'border-[var(--ops-border-strong)] bg-[var(--ops-surface-panel)] px-3'");
    expect(source).not.toContain("'border-[var(--ops-primary)] px-3'");
    expect(html).toContain('data-time-range-apply-action="true"');
    expect(html).toContain('data-time-range-apply-visual="neutral-query-action"');
    const applyButton = html.match(/<button[^>]*data-time-range-apply-action="true"[^>]*>/)?.[0] ?? '';
    expect(applyButton).toContain('border-[var(--ops-border-strong)]');
    expect(applyButton).toContain('bg-[var(--ops-surface-panel)]');
    expect(applyButton).not.toContain('border-[var(--ops-primary)]');
  });

  it('applies a sanitized custom relative window with refresh live and timezone state', () => {
    const onApply = vi.fn();
    const node = renderInteractive(
      <TimeRangeControl
        value={{ timeRange: 'last-45m', refresh: '30', live: 'true', tz: 'Asia/Shanghai' }}
        onApply={onApply}
      />
    );

    inputValue(node.querySelector('[data-time-range-relative-input="true"]') as HTMLInputElement, '45m');

    act(() => {
      (node.querySelector('[data-time-range-apply-action="true"]') as HTMLButtonElement).click();
    });

    expect(onApply).toHaveBeenCalledWith({
      timeRange: 'last-45m',
      refresh: '30',
      live: 'true',
      tz: 'Asia/Shanghai'
    });
  });
});
