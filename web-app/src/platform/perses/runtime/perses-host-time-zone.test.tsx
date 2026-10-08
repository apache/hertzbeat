/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { useTimeZone } from '@perses-dev/components';
import { afterEach, expect, it } from 'vitest';
import { HertzBeatTimeZoneProvider } from '../index';
function NativeChartClock() {
  const { formatWithUserTimeZone } = useTimeZone();
  return (
    <>
      <output>{formatWithUserTimeZone(new Date('2026-09-08T06:00:00Z'), 'HH:mm')}</output>
      <input aria-label="inspection" defaultValue="retained" />
    </>
  );
}
afterEach(cleanup);
it('applies host timezone to native chart formatting without discarding inspection', () => {
  const view = render(
    <HertzBeatTimeZoneProvider timeZone="UTC">
      <NativeChartClock />
    </HertzBeatTimeZoneProvider>
  );
  expect(screen.getByRole('status')).toHaveTextContent('06:00');
  const input = screen.getByRole('textbox');
  view.rerender(
    <HertzBeatTimeZoneProvider timeZone="Asia/Shanghai">
      <NativeChartClock />
    </HertzBeatTimeZoneProvider>
  );
  expect(screen.getByRole('status')).toHaveTextContent('14:00');
  expect(screen.getByRole('textbox')).toBe(input);
});
