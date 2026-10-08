/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { SharedTimeValue } from '@/shared/time';
import { ExploreTimeControl } from './explore-time-control';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

it('uses the Ant Design range picker and identifies the selected relative preset', () => {
  render(<ExploreTimeControl query={{ signal: 'logs', timeRange: 'last-15m' }} t={i18n.t} updateScope={vi.fn()} />);
  expect(screen.getAllByRole('textbox', { name: 'Time range' })).toHaveLength(2);
  expect(screen.getByText('Last 15 minutes')).toBeVisible();
});

it('freezes the current relative window and resumes the latest sliding window', () => {
  const updateScope = vi.fn();
  render(
    <ExploreTimeControl
      query={{ signal: 'logs', timeRange: 'last-15m', timeZone: 'UTC' }}
      t={i18n.t}
      updateScope={updateScope}
      time={{ window: { from: 1_790_758_477_107, to: 1_790_759_377_107 }, autoRefreshMs: 0 } as SharedTimeValue}
    />
  );

  expect(screen.getByRole('button', { name: i18n.t('explore.timeControl.nextWindow') })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.timeControl.pause') }));
  expect(updateScope).toHaveBeenCalledWith(
    expect.objectContaining({ start: 1_790_758_477_107, end: 1_790_759_377_107 })
  );
  expect(updateScope.mock.calls[0]?.[0]).toHaveProperty('autoRefreshMs', undefined);
});

it('pauses the route preset rather than the unrelated shared time preset', () => {
  const updateScope = vi.fn();
  const to = 1_790_759_377_107;
  render(
    <ExploreTimeControl
      query={{ signal: 'logs', timeRange: 'last-24h', timeZone: 'UTC' }}
      t={i18n.t}
      updateScope={updateScope}
      time={{ window: { from: to - 30 * 60_000, to }, autoRefreshMs: 0 } as SharedTimeValue}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.timeControl.pause') }));
  expect(updateScope).toHaveBeenCalledWith(expect.objectContaining({ start: to - 24 * 60 * 60_000, end: to }));
});

it('retains a selected refresh cadence on the paused route across the control remount', () => {
  const updateScope = vi.fn();
  const query = { signal: 'logs' as const, timeRange: 'last-15m' as const, autoRefreshMs: 60_000, timeZone: 'UTC' };
  const { rerender } = render(
    <ExploreTimeControl
      query={query}
      t={i18n.t}
      updateScope={updateScope}
      time={{ window: { from: 1_790_758_477_107, to: 1_790_759_377_107 }, autoRefreshMs: 0 } as SharedTimeValue}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.timeControl.pause') }));
  expect(updateScope).toHaveBeenCalledWith(
    expect.objectContaining({ start: 1_790_758_477_107, end: 1_790_759_377_107 })
  );
  expect(updateScope.mock.calls[0]?.[0]).toHaveProperty('autoRefreshMs', undefined);

  updateScope.mockClear();
  rerender(
    <ExploreTimeControl
      query={{ ...query, start: 1_790_758_477_107, end: 1_790_759_377_107 }}
      t={i18n.t}
      updateScope={updateScope}
      time={{ window: { from: 1_790_758_477_107, to: 1_790_759_377_107 }, autoRefreshMs: 0 } as SharedTimeValue}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.timeControl.play') }));
  expect(updateScope).toHaveBeenCalledWith(
    expect.objectContaining({ start: undefined, end: undefined, autoRefreshMs: 60_000 })
  );
});

it('steps exact log windows by their duration and plays the latest relative window', () => {
  const updateScope = vi.fn();
  const pausedQuery = {
    signal: 'logs' as const,
    timeRange: 'last-15m' as const,
    start: 1_790_758_477_107,
    end: 1_790_759_377_107,
    timeZone: 'UTC'
  };
  const { rerender } = render(<ExploreTimeControl query={pausedQuery} t={i18n.t} updateScope={updateScope} />);

  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.timeControl.previousWindow') }));
  expect(updateScope).toHaveBeenCalledWith(
    expect.objectContaining({ start: 1_790_757_577_107, end: 1_790_758_477_107 })
  );

  updateScope.mockClear();
  rerender(
    <ExploreTimeControl
      query={{ ...pausedQuery, start: 1_790_757_577_107, end: 1_790_758_477_107 }}
      t={i18n.t}
      updateScope={updateScope}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.timeControl.nextWindow') }));
  expect(updateScope).toHaveBeenCalledWith(
    expect.objectContaining({ start: 1_790_758_477_107, end: 1_790_759_377_107 })
  );

  updateScope.mockClear();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.timeControl.play') }));
  expect(updateScope).toHaveBeenCalledWith(
    expect.objectContaining({ start: undefined, end: undefined, autoRefreshMs: 30_000 })
  );
});

it('opens the built-in calendar and applies a quick range immediately', async () => {
  const updateScope = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreTimeControl
        query={{
          signal: 'logs',
          timeRange: 'last-30m',
          start: 1788786000000,
          end: 1788787800000,
          timeZone: 'Asia/Shanghai'
        }}
        t={i18n.t}
        updateScope={updateScope}
      />
    </I18nextProvider>
  );
  fireEvent.mouseDown(screen.getAllByRole('textbox', { name: 'Time range' })[0]!);
  fireEvent.click(screen.getAllByRole('textbox', { name: 'Time range' })[0]!);
  fireEvent.click(await screen.findByRole('button', { name: 'Last 15 minutes' }));
  expect(updateScope).toHaveBeenCalledWith(
    expect.objectContaining({ timeRange: 'last-15m', start: undefined, end: undefined })
  );
});

it('confirms the exact range with unchanged milliseconds', async () => {
  const updateScope = vi.fn();
  render(
    <ExploreTimeControl
      query={{
        signal: 'logs',
        timeRange: 'last-30m',
        start: 1788786000120,
        end: 1788787800340,
        timeZone: 'Asia/Shanghai'
      }}
      t={i18n.t}
      updateScope={updateScope}
    />
  );
  fireEvent.click(screen.getAllByRole('textbox', { name: 'Time range' })[0]!);
  fireEvent.click(await screen.findByRole('button', { name: 'Apply time' }));
  expect(updateScope).toHaveBeenCalledWith(expect.objectContaining({ start: 1788786000120, end: 1788787800340 }));
});

it('keeps a typed start edit when switching to the end input and applying', async () => {
  const updateScope = vi.fn();
  render(
    <ExploreTimeControl
      query={{
        signal: 'logs',
        timeRange: 'last-30m',
        start: 1788786000000,
        end: 1788787800000,
        timeZone: 'Asia/Shanghai'
      }}
      t={i18n.t}
      updateScope={updateScope}
    />
  );
  fireEvent.click(screen.getAllByRole('textbox', { name: 'Time range' })[0]!);
  const [start, end] = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' });
  fireEvent.change(start!, { target: { value: '2026-09-07 21:01:00' } });
  expect(start).toHaveValue('2026-09-07 21:01:00');
  fireEvent.mouseDown(end!);
  fireEvent.click(end!);
  end!.focus();
  expect(end).toHaveFocus();
  expect(start).toHaveValue('2026-09-07 21:01:00');
  fireEvent.click(await screen.findByRole('button', { name: 'Apply time' }));
  expect(updateScope).toHaveBeenCalledWith(expect.objectContaining({ start: 1788786060000, end: 1788787800000 }));
});

it('rejects invalid raw end text instead of applying the previous valid relative range', async () => {
  const updateScope = vi.fn();
  render(
    <ExploreTimeControl
      query={{ signal: 'logs', timeRange: 'last-15m', timeZone: 'Asia/Shanghai' }}
      t={i18n.t}
      time={{ window: { from: 1788786000000, to: 1788787800000 } } as SharedTimeValue}
      updateScope={updateScope}
    />
  );
  fireEvent.click(screen.getAllByRole('textbox', { name: 'Time range' })[0]!);
  const [, end] = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' });
  const originalEnd = end!.value;
  end!.focus();
  fireEvent.change(end!, { target: { value: 'not-a-date' } });
  expect(end).toHaveValue('not-a-date');
  const apply = await screen.findByRole('button', { name: 'Apply time' });
  fireEvent.mouseDown(apply);
  fireEvent.blur(end!, { relatedTarget: apply });
  fireEvent.click(apply);
  expect(updateScope).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('explore.timeControl.invalid'));
  fireEvent.change(end!, { target: { value: originalEnd } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.change(end!, { target: { value: 'not-a-date' } });
  fireEvent.click(screen.getAllByTitle('2026-09-07')[0]!);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('rebases a relative range from the executed window after refresh', () => {
  const query = { signal: 'logs', timeRange: 'last-15m', timeZone: 'Asia/Shanghai' } as const;
  const time = (to: number) => ({ window: { from: to - 30 * 60_000, to } }) as SharedTimeValue;
  const { rerender } = render(
    <ExploreTimeControl query={query} t={i18n.t} updateScope={vi.fn()} time={time(1788787800000)} />
  );
  const start = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' })[0]!;
  expect(start).toHaveValue('2026-09-07 21:15:00');
  rerender(<ExploreTimeControl query={query} t={i18n.t} updateScope={vi.fn()} time={time(1788787860000)} />);
  const refreshed = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' })[0]!;
  expect(refreshed).toHaveValue('2026-09-07 21:16:00');
  fireEvent.click(refreshed);
  expect(screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' })[0]).toHaveValue(
    '2026-09-07 21:16:00'
  );
});

it('keeps an open edit stable when the executed relative window refreshes', () => {
  const query = { signal: 'logs', timeRange: 'last-15m', timeZone: 'Asia/Shanghai' } as const;
  const time = (to: number) => ({ window: { from: to - 30 * 60_000, to } }) as SharedTimeValue;
  const { rerender } = render(
    <ExploreTimeControl query={query} t={i18n.t} updateScope={vi.fn()} time={time(1788787800000)} />
  );
  fireEvent.click(screen.getAllByRole('textbox', { name: 'Time range' })[0]!);
  const start = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' })[0]!;
  fireEvent.change(start, { target: { value: '2026-09-07 21:16:00' } });
  rerender(<ExploreTimeControl query={query} t={i18n.t} updateScope={vi.fn()} time={time(1788787860000)} />);
  expect(start).toHaveValue('2026-09-07 21:16:00');
  expect(screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' })[0]).toBe(start);
});

it('discards calendar edits after dismissing and reopening', () => {
  const updateScope = vi.fn();
  render(
    <>
      <input aria-label="Other field" />
      <ExploreTimeControl
        query={{
          signal: 'logs',
          timeRange: 'last-30m',
          start: 1788786000000,
          end: 1788787800000,
          timeZone: 'Asia/Shanghai'
        }}
        t={i18n.t}
        updateScope={updateScope}
      />
    </>
  );
  const start = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' })[0]!;
  const original = start.value;
  fireEvent.click(start);
  fireEvent.click(screen.getAllByTitle('2026-09-08')[0]!);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(updateScope).not.toHaveBeenCalled();
  const reopened = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' })[0]!;
  fireEvent.click(reopened);
  expect(reopened.value).toBe(original);
});

it('names the preset target before resuming a custom fixed log window', () => {
  const updateScope = vi.fn();
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-6h' as const,
    start: 1_790_759_077_107,
    end: 1_790_759_377_107,
    timeZone: 'UTC'
  };
  render(<ExploreTimeControl query={query} t={i18n.t} updateScope={updateScope} />);
  expect(screen.queryByRole('button', { name: i18n.t('explore.timeControl.play') })).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', {
      name: i18n.t('explore.timeControl.playPreset', { range: i18n.t('explore.timeRanges.last-6h') })
    })
  );
  expect(updateScope).toHaveBeenCalledWith(
    expect.objectContaining({
      timeRange: 'last-6h',
      start: undefined,
      end: undefined,
      autoRefreshMs: 30_000
    })
  );
});

it('shows the selected timezone without changing exact endpoint values or applying a scope patch', () => {
  const updateScope = vi.fn();
  render(
    <ExploreTimeControl
      query={{
        signal: 'traces',
        timeRange: 'last-30m',
        start: 1788786000120,
        end: 1788787800340,
        timeZone: 'Asia/Shanghai'
      }}
      t={i18n.t}
      updateScope={updateScope}
    />
  );
  expect(screen.getByText('GMT+8')).toHaveAttribute(
    'aria-label',
    i18n.t('explore.timeControl.zone', { zone: 'Asia/Shanghai' })
  );
  const [start, end] = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' });
  expect(start).toHaveValue('2026-09-07 21:00:00');
  expect(end).toHaveValue('2026-09-07 21:30:00');
  expect(updateScope).not.toHaveBeenCalled();
});

it('keeps a compact timezone in the log time-control row with keyboard access to its full name', () => {
  const updateScope = vi.fn();
  render(
    <ExploreTimeControl
      query={{
        signal: 'logs',
        timeRange: 'last-30m',
        start: 1788786000120,
        end: 1788787800340,
        timeZone: 'Asia/Shanghai'
      }}
      t={i18n.t}
      updateScope={updateScope}
    />
  );
  const zone = screen.getByText('GMT+8');
  expect(zone).toHaveAttribute('tabindex', '0');
  expect(zone.closest('[data-explore-time-part="range"]')).not.toBeNull();
  expect(screen.queryByText('Asia/Shanghai')).not.toBeInTheDocument();
  const [start, end] = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' });
  expect(start).toHaveValue('2026-09-07 21:00:00');
  expect(end).toHaveValue('2026-09-07 21:30:00');
  expect(updateScope).not.toHaveBeenCalled();
});

it('identifies both offsets when a log window crosses a daylight-saving change', () => {
  render(
    <ExploreTimeControl
      query={{
        signal: 'logs',
        timeRange: 'last-24h',
        start: Date.UTC(2026, 10, 1, 8, 30),
        end: Date.UTC(2026, 10, 1, 10, 30),
        timeZone: 'America/Los_Angeles'
      }}
      t={i18n.t}
      updateScope={vi.fn()}
    />
  );
  expect(screen.getByText('GMT-7 → GMT-8')).toBeVisible();
});
