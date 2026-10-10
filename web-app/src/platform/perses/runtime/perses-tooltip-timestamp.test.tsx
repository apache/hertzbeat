/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TooltipHeader } from '@perses-dev/components/dist/TimeSeriesTooltip/TooltipHeader';
import { afterEach, expect, it, vi } from 'vitest';
import { HertzBeatTimeZoneProvider } from '../index';

afterEach(cleanup);
const timestamp = Date.parse('2026-09-08T06:00:00Z');
const nearbySeries = [
  {
    seriesIdx: 0,
    datumIdx: 0,
    seriesName: 'a',
    date: timestamp,
    markerColor: '#000',
    x: 0,
    y: 1,
    formattedY: '1',
    isClosestToCursor: true
  }
];
it('renders source timestamps while preserving native pin controls and safe text', () => {
  const unpin = vi.fn();
  render(
    <HertzBeatTimeZoneProvider timeZone="UTC">
      <TooltipHeader
        nearbySeries={nearbySeries}
        totalSeries={1}
        isTooltipPinned
        showAllSeries={false}
        onUnpinClick={unpin}
        {...{
          renderTimestamp: (time: number) => <span>{`a ${time}; b ${time - 3600000}; <script>literal</script>`}</span>
        }}
      />
    </HertzBeatTimeZoneProvider>
  );
  expect(screen.getByText(`a ${timestamp}; b ${timestamp - 3600000}; <script>literal</script>`)).toBeVisible();
  expect(document.querySelector('script')).toBeNull();
  const customHeader = screen.getByText(
    `a ${timestamp}; b ${timestamp - 3600000}; <script>literal</script>`
  ).parentElement!;
  expect(getComputedStyle(customHeader).flexDirection).toBe('column');
  expect(getComputedStyle(customHeader).alignItems).toBe('stretch');
  const pin = document.querySelector('[data-testid="PinIcon"]');
  expect(pin).not.toBeNull();
  fireEvent.click(pin!);
  expect(unpin).toHaveBeenCalledOnce();
});
it('keeps ordinary tooltip timestamps unchanged without a host renderer', () => {
  render(
    <HertzBeatTimeZoneProvider timeZone="UTC">
      <TooltipHeader nearbySeries={nearbySeries} totalSeries={1} isTooltipPinned={false} showAllSeries={false} />
    </HertzBeatTimeZoneProvider>
  );
  const ordinaryHeader = screen.getByText('06:00:00');
  expect(ordinaryHeader).toBeVisible();
  expect(getComputedStyle(ordinaryHeader).flexDirection).toBe('row');
});
