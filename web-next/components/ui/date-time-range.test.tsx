import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DateTimeRange } from './date-time-range';

describe('DateTimeRange', () => {
  it('renders a cold custom date-time picker without native browser date panels', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/ui/date-time-range.tsx'), 'utf8');
    const globals = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');
    const html = renderToStaticMarkup(
      <DateTimeRange
        mode="datetime-local"
        startName="silence_period_start"
        endName="silence_period_end"
        startValue="2026-04-19T08:00"
        endValue="2026-04-19T14:00"
        onStartChange={vi.fn()}
        onEndChange={vi.fn()}
        reserveActionSpace
      />
    );

    expect(html).toContain('data-cold-date-time-range-owner="cold-date-time-range"');
    expect(html).toContain('data-cold-date-time-range-shell="unframed-inline"');
    expect(html).toContain('data-cold-date-time-range-action-space="reserved"');
    expect(html).toContain('data-cold-date-time-range-reserved-action="true"');
    expect(html.match(/data-cold-date-time-picker-owner="cold-date-time-picker"/g)).toHaveLength(2);
    expect(html.match(/data-cold-date-time-picker-library="react-datepicker"/g)).toHaveLength(2);
    expect(html).toContain('data-cold-date-time-picker-trigger="true"');
    expect(html).toContain('data-cold-date-time-picker-input="hidden-value"');
    expect(html).not.toContain('今天');
    expect(html).not.toContain('type="datetime-local"');
    expect(html).not.toContain('type="date"');
    expect(html).not.toContain('type="time"');
    expect(source).toContain("from 'react-datepicker'");
    expect(source).toContain("from 'date-fns/locale/zh-CN'");
    expect(source).toContain("registerLocale('zh-CN', zhCN)");
    expect(source).toContain('inline');
    expect(source).toContain('getPickerPanelPosition');
    expect(source).toContain('data-cold-date-time-picker-portal="body"');
    expect(source).toContain('data-cold-date-time-picker-panel="body-fixed-clear-confirm"');
    expect(source).toContain('createPortal(panel, document.body)');
    expect(source).toContain('locale="zh-CN"');
    expect(source).toContain('data-cold-date-time-picker-time-columns="hour-minute"');
    expect(source).toContain('data-cold-date-time-picker-layout');
    expect(source).toContain('calendar-time-columns');
    expect(source).toContain('data-cold-date-time-picker-surface="flat-calendar-time"');
    expect(source).toContain('data-cold-date-time-picker-calendar-shell="fixed-calendar"');
    expect(source).toContain('const PICKER_PANEL_WIDTH = 392');
    expect(source).toContain("mode === 'time' ? 'w-[220px]' : 'w-[392px]'");
    expect(source).toContain("mode === 'time' ? 'block' : 'grid grid-cols-[258px_132px]'");
    expect(source).toContain("mode === 'time' ? 'grid w-full grid-cols-2' : 'grid w-[132px] shrink-0 grid-cols-2 md:border-l'");
    expect(source).toContain('box-border overflow-x-hidden overflow-y-hidden rounded-[4px]');
    expect(source).toContain('overflow-x-hidden');
    expect(source).toContain('hertzbeat-time-column-scroll');
    expect(source).toContain('bg-[#101217]');
    expect(source).toContain('place-items-center');
    expect(source).toContain('tabular-nums');
    expect(source).toContain('h-6 w-full');
    expect(source).toContain('max-h-[168px]');
    expect(source).toContain('data-cold-time-column={column}');
    expect(source).toContain("column: 'hour' | 'minute'");
    expect(source).toContain('TIME_HOURS');
    expect(source).toContain('TIME_MINUTES');
    expect(source).toContain('shouldCloseOnSelect={false}');
    expect(source).not.toContain('showTimeSelect');
    expect(source).not.toContain('showTimeSelectOnly');
    expect(source).not.toContain('timeIntervals={1}');
    expect(source).not.toContain('timeFormat="HH:mm"');
    expect(source).toContain('data-cold-date-time-picker-action="clear"');
    expect(source).toContain('data-cold-date-time-picker-action="confirm"');
    expect(source).not.toContain('type={mode}');
    expect(source).not.toContain('absolute left-0 top-[calc(100%+6px)]');
    expect(source).not.toContain("rounded-[3px] border border-[#2b3039] bg-[#0d1015] p-2");
    expect(source).not.toContain('getCalendarDays');
    expect(source).not.toContain('data-cold-calendar-grid');
    expect(source).not.toContain('placeholder="YYYY-MM-DD"');
    expect(source).not.toContain('placeholder="HH:mm"');
    expect(source).not.toContain("mode === 'time' ? 'w-[220px]' : 'w-[430px]'");
    expect(source).not.toContain("mode === 'time' ? 'w-[220px]' : 'w-[390px]'");
    expect(source).not.toContain("mode === 'time' ? 'block' : 'flex flex-col md:flex-row'");
    expect(source).not.toContain('min-w-[156px]');
    expect(source).not.toContain('max-h-[224px]');
    expect(source).not.toContain('overflow-auto rounded-[4px]');
    expect(source).not.toContain('bg-[#0f141d]');
    expect(globals).toContain('.hertzbeat-date-picker-panel *');
    expect(globals).toContain('box-sizing: border-box;');
    expect(globals).toContain('.hertzbeat-date-picker-panel .react-datepicker__month {');
    expect(globals).toContain('margin: 0;');
    expect(globals).toContain('overflow-x: hidden;');
    expect(globals).toContain('.hertzbeat-date-picker-panel .react-datepicker__week {');
    expect(globals).toContain('grid-template-columns: repeat(7, 1fr);');
    expect(globals).toContain('.hertzbeat-date-picker-panel .react-datepicker__day-name,');
    expect(globals).toContain('place-items: center;');
  });

  it('renders a cold custom time range with the same clear and confirm actions', () => {
    const html = renderToStaticMarkup(
      <DateTimeRange
        mode="time"
        startName="silence_period_start"
        endName="silence_period_end"
        startValue="09:00"
        endValue="18:00"
        onStartChange={vi.fn()}
        onEndChange={vi.fn()}
      />
    );

    expect(html).toContain('data-cold-time-range-owner="cold-time-range"');
    expect(html).toContain('data-cold-date-time-range-shell="unframed-inline"');
    expect(html.match(/data-cold-date-time-picker-owner="cold-date-time-picker"/g)).toHaveLength(2);
    expect(html.match(/data-cold-date-time-picker-library="react-datepicker"/g)).toHaveLength(2);
    expect(html).toContain('09:00');
    expect(html).toContain('18:00');
    expect(html).not.toContain('今天');
    expect(html).not.toContain('type="time"');
  });

  it('renders English fallback default trigger labels', () => {
    const html = renderToStaticMarkup(
      <DateTimeRange
        mode="time"
        startName="periodStart"
        endName="periodEnd"
        startValue=""
        endValue=""
        onStartChange={vi.fn()}
        onEndChange={vi.fn()}
      />
    );

    expect(html.match(/>Not set</g)).toHaveLength(2);
    expect(html).toContain('aria-label="Start"');
    expect(html).toContain('aria-label="End"');
    expect(html).not.toContain('未设置');
    expect(html).not.toContain('aria-label="开始"');
    expect(html).not.toContain('aria-label="结束"');
  });

  it('keeps empty-state picker chrome caller-owned', () => {
    const html = renderToStaticMarkup(
      <DateTimeRange
        mode="time"
        startName="periodStart"
        endName="periodEnd"
        startValue=""
        endValue=""
        onStartChange={vi.fn()}
        onEndChange={vi.fn()}
        startLabel="Start time"
        endLabel="End time"
        emptyLabel="Not set"
        hourLabel="Hour"
        minuteLabel="Minute"
        previousMonthLabel="Previous month"
        nextMonthLabel="Next month"
        clearLabel="Clear"
        confirmLabel="OK"
      />
    );

    expect(html.match(/Not set/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Start time"');
    expect(html).toContain('aria-label="End time"');
    expect(html).not.toContain('未设置');
  });
});
