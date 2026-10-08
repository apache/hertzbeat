/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. The ASF licenses this file to You under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { createHertzBeatPersesTheme } from './hertzbeat-perses-theme';
import { createHertzBeatChartsTheme } from './hertzbeat-perses-charts-theme';

it.each(['default', 'dark'] as const)('keeps %s chart furniture secondary and count bars bounded', mode => {
  const theme = createHertzBeatPersesTheme(mode);
  const regular = createHertzBeatChartsTheme(theme).echartsTheme;
  expect(regular.timeAxis).toMatchObject({ axisLabel: { color: theme.palette.text.secondary, fontSize: 11 } });
  expect(regular.valueAxis).toMatchObject({ axisTick: { show: false } });
  expect(regular.line).toMatchObject({ connectNulls: false, smooth: false });
  const compact = createHertzBeatChartsTheme(theme, true, true, 12).echartsTheme;
  expect(compact.bar).toMatchObject({ barMaxWidth: 25, barWidth: '50%' });
  expect(compact.color).not.toContain(theme.palette.primary.main);
  expect(compact.animation).toBe(false);
});

it('keeps the short count histogram grid sparse at a non-round peak', () => {
  const theme = createHertzBeatPersesTheme('default');
  const histogram = createHertzBeatChartsTheme(theme, true, false, 56).echartsTheme;
  expect(histogram.timeAxis).toMatchObject({
    axisLabel: { alignMinLabel: 'left', alignMaxLabel: 'right' },
    splitLine: { show: false }
  });
  expect(histogram.valueAxis).toMatchObject({ interval: 56 });
  const regular = createHertzBeatChartsTheme(theme).echartsTheme;
  expect(regular.valueAxis).not.toHaveProperty('interval');
});
