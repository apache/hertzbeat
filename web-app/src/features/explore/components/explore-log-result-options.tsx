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

import { SettingOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';

import type { LogColumn, LogColumnControls } from '../model/explore-log-columns';
import type { LogSortControls } from '../model/explore-log-order';
import type { LogExploreQuery } from '../model/explore-query';
import type { ExploreLogDisplayPreferences } from './explore-log-display-preferences';
import { LogResultOptionsContent } from './explore-log-result-options-content';
import styles from './explore-log-result-options.module.css';

type Props = {
  logOrder?: LogSortControls | undefined;
  logColumns?: LogColumnControls | undefined;
  availableColumns?: LogColumn[] | undefined;
  query: LogExploreQuery;
  preferences: ExploreLogDisplayPreferences;
  onPreferencesChange: (preferences: ExploreLogDisplayPreferences) => void;
  t: TFunction;
};

export function ExploreLogResultOptions(props: Props) {
  const { logColumns, t } = props;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      autoAdjustOverflow
      align={{ offset: [0, 0], overflow: { adjustX: true, adjustY: true, shiftX: true, shiftY: true } }}
      destroyOnHidden
      open={open}
      onOpenChange={setOpen}
      content={
        <div
          className={styles.optionsSurface}
          data-columns={Boolean(logColumns)}
          onKeyDown={event => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
          }}
        >
          <LogResultOptionsContent {...props} />
        </div>
      }
    >
      <Button
        ref={trigger}
        className={styles.optionsButton ?? ''}
        aria-expanded={open}
        onKeyDown={event => {
          if (event.key !== 'Escape' || !open) return;
          event.stopPropagation();
          setOpen(false);
        }}
      >
        <SettingOutlined aria-hidden /> {t('explore.perses.options')}
      </Button>
    </Popover>
  );
}
