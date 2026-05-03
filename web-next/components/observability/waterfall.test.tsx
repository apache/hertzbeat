// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObservabilityWaterfall } from './waterfall';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let interactionRoot: Root | null = null;
let interactionContainer: HTMLDivElement | null = null;

afterEach(() => {
  if (interactionRoot) {
    act(() => {
      interactionRoot?.unmount();
    });
  }
  interactionRoot = null;
  interactionContainer?.remove();
  interactionContainer = null;
});

describe('observability waterfall', () => {
  it('renders a shared waterfall shell with compact bar insets, fine timeline density, stable selected rows, strong duration typography, wrapped name cells, a minimum visible span bar, subtle duration-offset cues, tokenized subtitle cues, striped timeline tracks, wrap-aware title/detail cues, selected-row highlight cues, root and danger tree-dot cues, offset, ruler ticks, span evidence, start markers, tree dots, and explicit indents', () => {
    const html = renderToStaticMarkup(
      <ObservabilityWaterfall
        timelineTicks={[
          { percent: 0, label: '0 ms' },
          { percent: 25, label: '250 ms' },
          { percent: 50, label: '500 ms' },
          { percent: 100, label: '1.00 s' }
        ]}
        rows={[
          {
            key: 'root',
            title: 'GET /checkout',
            subtitle: 'checkout · OK',
            detailLabel: 'trace-root-span-id',
            durationLabel: '842ms',
            offsetLabel: '-',
            leftPct: 0,
            widthPct: 88,
            selected: true,
            events: [
              { key: 'root:event:recv', label: 'request received', leftPct: 4 },
              { key: 'root:event:queue', label: 'queue wait', leftPct: 18 }
            ]
          },
          {
            key: 'db',
            title: 'db.query.with.a.very.long.span.name.that.should.wrap.instead.of.truncating',
            subtitle: 'postgres · ERROR',
            detailLabel: 'db-span-id-1234567890-with-extra-evidence-that-should-wrap-cleanly',
            durationLabel: '412ms',
            offsetLabel: '14ms',
            leftPct: 22,
            widthPct: 46,
            depth: 2,
            tone: 'danger',
            events: [{ key: 'db:event:exception', label: 'exception', leftPct: 66, tone: 'danger' }]
          },
          {
            key: 'cache',
            title: 'cache.lookup',
            subtitle: 'redis · OK',
            detailLabel: 'cache-span-id',
            durationLabel: '34ms',
            offsetLabel: '520ms',
            leftPct: 72,
            widthPct: 12,
            depth: 1,
            tone: 'default'
          }
        ]}
        selectedEventKey="db:event:exception"
        onSelect={() => undefined}
        onSelectEvent={() => undefined}
      />
    );

    expect(html).toContain('Span');
    expect(html).toContain('Duration');
    expect(html).toContain('Timeline');
    expect(html).toContain('GET /checkout');
    expect(html).toContain('842ms');
    expect(html).toContain('data-observability-waterfall="true"');
    expect(html).toContain('data-waterfall-density="fine"');
    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('bg-[var(--ops-surface-panel)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('bg-black/10');
    expect(html).not.toContain('border-white/7');
    expect(html).toContain('data-waterfall-duration-tone="strong"');
    expect(html).toContain('text-[12px] font-semibold');
    expect(html).toContain('db.query.with.a.very.long.span.name.that.should.wrap.instead.of.truncating');
    expect(html).toContain('cache.lookup');
    expect(html).toContain('412ms');
    expect(html).toContain('34ms');
    expect(html).toContain('14ms');
    expect(html).toContain('data-waterfall-offset-tone="subtle"');
    expect(html).not.toContain('uppercase tracking-[0.14em]');
    expect(html).toContain('data-waterfall-subtitle-tokens="true"');
    expect(html).not.toContain('checkout · OK');
    expect(html).not.toContain('postgres · ERROR');
    expect(html).toContain('db-span-id-1234567890-with-extra-evidence-that-should-wrap-cleanly');
    expect(html).toContain('data-waterfall-name-shell="true"');
    expect(html).toContain('data-waterfall-title-wrap="anywhere"');
    expect(html).toContain('data-waterfall-detail-wrap="anywhere"');
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).toContain('bg-[rgba(88,112,145,.10)]');
    expect(html).toContain('data-waterfall-row-tone="selected"');
    expect(html).toContain('shadow-[inset_2px_0_0_rgba(132,151,176,0.62)]');
    expect(html).not.toContain('border-b border-[#596577]/45');
    expect(html).toContain('rgba(197,96,104,0.92)');
    expect(html).toContain('bg-[linear-gradient(90deg,rgba(112,126,148,0.92),rgba(151,162,180,0.78))]');
    expect(html).not.toContain('from-sky-500');
    expect(html).not.toContain('to-indigo-400');
    expect(html).toContain('0 ms');
    expect(html).toContain('250 ms');
    expect(html).toContain('1.00 s');
    expect(html).toContain('data-waterfall-start-marker="true"');
    expect(html).toContain('top-[1px] bottom-[1px]');
    expect(html).toContain('data-waterfall-bar-track="striped"');
    expect(html).toContain('data-waterfall-bar-shell="true"');
    expect(html).toContain('data-waterfall-minimap="span-event-overview"');
    expect(html).toContain('data-waterfall-axis-layout="stacked-full-width"');
    expect(html).toContain('data-waterfall-minimap-axis="stacked-full-width"');
    expect(html).toContain('data-waterfall-coordinate-system="stacked-full-width-axis"');
    expect(html).toContain('data-waterfall-minimap-summary-row="separate-overview-row"');
    expect(html).toContain('data-waterfall-minimap-summary="timeline-context"');
    expect(html).toContain('data-waterfall-minimap-lanes="row-order"');
    expect(html).toContain('data-waterfall-minimap-lane-key="db"');
    expect(html).toContain('data-waterfall-minimap-lane-index="1"');
    expect(html).toContain('data-waterfall-minimap-bar-visual="shared-span-bar"');
    expect(html).toContain('data-waterfall-row-bar-visual="shared-span-bar"');
    expect(html).toContain('data-waterfall-minimap-bar-height="matches-row-bar"');
    expect(html).toContain('data-waterfall-event-marker-source="lucide"');
    expect(html).toContain('data-waterfall-event-marker-icon="flag"');
    expect(html).toContain('data-waterfall-event-marker-icon="circle-alert"');
    expect(html).toContain('lucide-flag');
    expect(html).toContain('lucide-circle-alert');
    expect(html).not.toContain('data-waterfall-minimap-event-marker-shape="timeline-event-pin"');
    expect(html).not.toContain('border-b-[6px]');
    expect(html).not.toContain('border-l-[3px]');
    expect(html).not.toContain('data-waterfall-minimap-bar-height="compressed"');
    expect(html).not.toContain('data-waterfall-minimap-depth-lanes="true"');
    expect(html).toContain('data-waterfall-ruler-axis="stacked-full-width"');
    expect(html).toContain('data-waterfall-row-meta="span-and-duration"');
    expect(html).toContain('data-waterfall-row-axis-layout="stacked-full-width"');
    expect(html).toContain('data-waterfall-coordinate-surface="borderless-percent-axis"');
    expect(html).toContain('data-waterfall-minimap-bar-key="db"');
    expect(html).toContain('data-waterfall-row-bar-key="db"');
    expect(html).toContain('data-waterfall-bar-left-pct="22"');
    expect(html).toContain('data-waterfall-bar-width-pct="46"');
    expect(html).toContain('data-waterfall-bar-tone="danger"');
    expect(html).toContain('ring-1 ring-inset ring-[var(--ops-border-color)]');
    expect(html).not.toContain('relative overflow-hidden rounded-[2px] border border-[var(--ops-border-color)]');
    expect(html).not.toContain('data-waterfall-minimap-axis="aligned-to-row-timeline"');
    expect(html).not.toContain('data-waterfall-minimap-axis="full-row-overview"');
    expect(html).toContain('data-waterfall-minimap-bar="true"');
    expect(html).toContain('data-waterfall-minimap-event-marker="true"');
    expect(html).toContain('data-waterfall-event-marker="true"');
    expect(html).toContain('data-waterfall-event-marker-action="select-span-event"');
    expect(html).toContain('data-waterfall-event-marker-selected="true"');
    expect(html).toContain('role="button"');
    expect(html).toContain('data-waterfall-event-count="true"');
    expect(html).toContain('data-waterfall-row-layout="fixed-height"');
    expect(html).toContain('min-h-[92px]');
    expect(html).not.toContain('data-waterfall-event-rail="selected-event-timeline"');
    expect(html).not.toContain('data-waterfall-event-chip="true"');
    expect(html).toContain('3 events');
    expect(html).toContain('request received');
    expect(html).toContain('exception');
    expect(html).toContain('grid-cols-[minmax(0,1fr)_88px]');
    expect(html).not.toContain('grid-cols-[minmax(0,280px)_88px_minmax(0,4fr)]');
    expect(html).not.toContain('calc(16px + (100% - 32px)');
    expect(html).toContain('h-[14px]');
    expect(html).not.toContain('h-[18px]');
    expect(html).not.toContain('h-[26px]');
    expect(html).toContain('min-width:2px');
    expect(html).toContain('top-[3px] bottom-[3px]');
    expect(html).toContain('w-[18px]');
    expect(html).not.toContain('w-[7px]');
    expect(html).toContain('repeating-linear-gradient(90deg');
    expect(html).toContain('data-waterfall-tree-dot="true"');
    expect(html).toContain('data-waterfall-tree-dot-tone="root"');
    expect(html).toContain('data-waterfall-tree-dot-tone="danger"');
    expect(html).toContain('data-waterfall-indent="true"');
    expect(html).toContain('border-[#6f7b90]/70');
    expect(html).toContain('border-[#c56a72]/80');
    expect(html).toContain('border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)]');
    expect(html).toContain('width:32px');
  });

  it('uses Chinese count labels for the trace workbench waterfall timeline and row events', () => {
    const html = renderToStaticMarkup(
      <ObservabilityWaterfall
        spanLabel="跨度"
        durationLabel="耗时"
        timelineLabel="时间轴"
        rows={[
          {
            key: 'root',
            title: 'GET /checkout',
            subtitle: 'checkout · OK',
            detailLabel: 'root-span-id',
            durationLabel: '842ms',
            offsetLabel: '0ms',
            leftPct: 0,
            widthPct: 88,
            events: [
              { key: 'root:event:recv', label: 'request received', leftPct: 4 },
              { key: 'root:event:queue', label: 'queue wait', leftPct: 18 }
            ]
          }
        ]}
      />
    );

    expect(html).toContain('时间轴总览');
    expect(html).toContain('1 个跨度 · 2 个事件');
    expect(html).toContain('2 个事件');
    expect(html).not.toContain('1 spans');
    expect(html).not.toContain('2 events');
  });

  it('selects span events without changing the parent row selection', async () => {
    const onSelect = vi.fn();
    const onSelectEvent = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <ObservabilityWaterfall
          rows={[
            {
              key: 'span-1',
              title: 'POST /checkout',
              durationLabel: '810ms',
              leftPct: 0,
              widthPct: 100,
              events: [{ key: 'span-1:event:0', label: 'exception', leftPct: 42, tone: 'danger' }]
            }
          ]}
          onSelect={onSelect}
          onSelectEvent={onSelectEvent}
        />
      );
      await Promise.resolve();
    });

    const eventAction = interactionContainer.querySelector('[data-waterfall-event-marker-action="select-span-event"]') as HTMLElement | null;
    expect(eventAction).not.toBeNull();

    await act(async () => {
      eventAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onSelectEvent).toHaveBeenCalledWith('span-1:event:0', 'span-1');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
