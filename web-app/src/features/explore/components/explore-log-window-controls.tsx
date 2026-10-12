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

import { Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useEffect, useState, type MutableRefObject } from 'react';
import {
  exactTimeRangePatch,
  presetTimeRangePatch,
  timeRangeMilliseconds,
  type LogExploreQuery
} from '../model/explore-model';
import { logResumeRefreshInterval, fixedLogWindow } from '../model/explore-log-window-state';
import type { ExploreTimeControlProps } from './explore-time-control-contract';
import { initialWindow } from './use-explore-time-editor';
import styles from './explore-time-control.module.css';

export function LogWindowControls({
  query,
  time,
  updateScope,
  resumeIntervalRef,
  t
}: Omit<ExploreTimeControlProps, 'query'> & { query: LogExploreQuery; resumeIntervalRef: MutableRefObject<number> }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = globalThis.setInterval(update, 60_000);
    return () => globalThis.clearInterval(timer);
  }, []);
  const fixed = fixedLogWindow(query);
  const window = fixed ?? initialWindow(query, time);
  const duration = window.to - window.from;
  const zone = query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const move = (direction: -1 | 1) => {
    const patch = shiftedWindowPatch(window, duration, direction, zone);
    if (patch) updateScope(patch);
  };
  const play = () =>
    updateScope({
      ...presetTimeRangePatch(query, query.timeRange),
      autoRefreshMs: resumeIntervalRef.current
    });
  const pause = () => {
    resumeIntervalRef.current = logResumeRefreshInterval(query, time, resumeIntervalRef.current);
    const patch = exactTimeRangePatch(window, zone);
    if (patch) updateScope(patch);
  };
  const paused = fixed != null;
  let actionLabel = t('explore.timeControl.pause');
  if (paused) {
    actionLabel =
      duration === timeRangeMilliseconds(query.timeRange)
        ? t('explore.timeControl.play')
        : t('explore.timeControl.playPreset', { range: t(`explore.timeRanges.${query.timeRange}`) });
  }
  return (
    <div className={styles.windowControls} role="group" aria-label={t('explore.timeControl.windowNavigation')}>
      <Button size="small" aria-label={t('explore.timeControl.previousWindow')} onClick={() => move(-1)}>
        <LeftOutlined aria-hidden />
      </Button>
      <Button size="small" onClick={paused ? play : pause}>
        {actionLabel}
      </Button>
      <Button
        size="small"
        aria-label={t('explore.timeControl.nextWindow')}
        disabled={!paused || window.to + duration > now}
        onClick={() => move(1)}
      >
        <RightOutlined aria-hidden />
      </Button>
    </div>
  );
}

function shiftedWindowPatch(
  window: { from: number; to: number },
  duration: number,
  direction: -1 | 1,
  timeZone: string
) {
  return exactTimeRangePatch(
    { from: window.from + direction * duration, to: window.to + direction * duration },
    timeZone
  );
}
