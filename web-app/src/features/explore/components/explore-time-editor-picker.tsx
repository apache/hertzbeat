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

import { DatePicker } from 'antd';
import type { ExploreTimeControlProps } from './explore-time-control-contract';
import { wallRange, type useTimeEditor } from './use-explore-time-editor';
import { TimePresets } from './explore-time-presets';
import styles from './explore-time-control.module.css';

export function TimeEditorPicker({
  query,
  t,
  zone,
  editor
}: Pick<ExploreTimeControlProps, 'query' | 't'> & {
  zone: string;
  editor: ReturnType<typeof useTimeEditor>;
}) {
  return (
    <DatePicker.RangePicker
      key={`${editor.visible.from}/${editor.visible.to}/${editor.reset}`}
      popupAlign={{ offset: [0, 0], overflow: { adjustX: true, adjustY: true, shiftX: true, shiftY: true } }}
      aria-label={t('explore.timeRange')}
      aria-invalid={editor.error}
      className={styles.picker ?? ''}
      classNames={{ popup: { root: styles.popup ?? '' } }}
      format="YYYY-MM-DD HH:mm:ss"
      showTime={{ format: 'HH:mm:ss' }}
      disabledDate={(current, info) => {
        return Boolean(info.from && Math.abs(current.startOf('day').diff(info.from.startOf('day'), 'day')) > 1);
      }}
      needConfirm={false}
      allowClear={false}
      preserveInvalidOnBlur
      status={editor.error ? 'error' : ''}
      defaultValue={wallRange(editor.visible, zone)}
      open={editor.open}
      onOpenChange={next => {
        if (next && !editor.open) editor.openEditor();
        if (!next) editor.close();
      }}
      onCalendarChange={(range, _, info) => editor.range.calendarChange(range, info.range)}
      onFocus={(_, info) => {
        if (info.range) editor.range.setActive(info.range);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      renderExtraFooter={() => (
        <TimePresets
          query={query}
          t={t}
          zone={zone}
          choose={editor.preset}
          cancel={editor.close}
          apply={editor.apply}
          error={editor.error}
        />
      )}
    />
  );
}
