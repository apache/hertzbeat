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

import { useRef, type MutableRefObject } from 'react';
import { positiveRefreshInterval } from '../model/explore-log-window-state';
import type { ExploreTimeControlProps } from './explore-time-control-contract';
import { useTimeEditor } from './use-explore-time-editor';
import { TimeEditorPicker } from './explore-time-editor-picker';
import { LogWindowControls } from './explore-log-window-controls';
import { LogTimeZoneLabel } from './explore-log-time-zone-label';
import styles from './explore-time-control.module.css';

export function ExploreTimeControl(props: ExploreTimeControlProps) {
  const zone = props.query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { start, end, timeRange } = props.query;
  const resumeIntervalRef = useRef(
    positiveRefreshInterval(props.query.autoRefreshMs) ?? positiveRefreshInterval(props.time?.autoRefreshMs) ?? 30_000
  );
  return (
    <div className={styles.timeWithZone} data-explore-time-part="zone-group">
      <TimeRangePicker
        key={`${start}/${end}/${timeRange}/${zone}`}
        {...props}
        zone={zone}
        resumeIntervalRef={resumeIntervalRef}
      />
    </div>
  );
}

function TimeRangePicker(
  props: ExploreTimeControlProps & { zone: string; resumeIntervalRef: MutableRefObject<number> }
) {
  const { query, t, zone } = props;
  const editor = useTimeEditor(props);
  const relative = query.start == null || query.end == null;
  return (
    <div
      className={styles.control}
      data-explore-time-part="range"
      onChangeCapture={event => {
        if (event.target instanceof HTMLInputElement) editor.range.input(event.target.value);
      }}
    >
      <span className={styles.relativeLabel} data-explore-time-part="preset">
        {relative ? t(`explore.timeRanges.${query.timeRange}`) : t('explore.timeRange')}
      </span>
      <LogTimeZoneLabel zone={zone} window={editor.visible} t={t} />
      <TimeEditorPicker query={query} t={t} zone={zone} editor={editor} />
      {query.signal === 'logs' && <LogWindowControls {...props} query={query} />}
    </div>
  );
}
