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

import { Radio, Switch } from 'antd';
import type { TFunction } from 'i18next';
import type { LogColumn, LogColumnControls } from '../model/explore-log-columns';
import type { LogExploreQuery } from '../model/explore-query';
import { ExploreLogColumns } from './explore-log-columns';
import type { ExploreLogDisplayPreferences } from './explore-log-display-preferences';
import styles from './explore-log-result-options.module.css';
type LogResultOptionsContentProps = {
  logColumns?: LogColumnControls | undefined;
  availableColumns?: LogColumn[] | undefined;
  query: LogExploreQuery;
  preferences: ExploreLogDisplayPreferences;
  onPreferencesChange: (preferences: ExploreLogDisplayPreferences) => void;
  t: TFunction;
};

export function LogResultOptionsContent({
  logColumns,
  availableColumns,
  query,
  preferences,
  onPreferencesChange,
  t
}: LogResultOptionsContentProps) {
  return (
    <>
      {!query.live && (
        <>
          <div className={styles.optionSection}>
            <PreferenceToggle
              label={t('explore.perses.timelineGraph')}
              checked={preferences.showTimeline ?? true}
              onChange={showTimeline => onPreferencesChange({ ...preferences, showTimeline })}
            />
            <PreferenceToggle
              label={t('explore.perses.standardizeHeaders')}
              checked={preferences.standardizeHeaders ?? true}
              onChange={standardizeHeaders => onPreferencesChange({ ...preferences, standardizeHeaders })}
            />
          </div>
        </>
      )}
      <div className={styles.optionSection}>
        <h4>{t('explore.logColumns.title')}</h4>
        <PreferenceToggle
          label={t('explore.perses.showDateColumn')}
          checked={preferences.showTime}
          onChange={showTime => onPreferencesChange({ ...preferences, showTime })}
        />
        <PreferenceToggle
          label={t('explore.perses.showContentColumn')}
          checked={preferences.showContent ?? true}
          onChange={showContent => onPreferencesChange({ ...preferences, showContent })}
        />
      </div>
      <div className={styles.optionSection}>
        <RowHeights preferences={preferences} onChange={onPreferencesChange} t={t} />
      </div>
      {!query.live && (
        <div className={styles.optionSection}>
          <DisplayModes preferences={preferences} onChange={onPreferencesChange} t={t} />
        </div>
      )}
      {logColumns && (
        <div className={styles.columnSection}>
          <ExploreLogColumns controls={logColumns} availableColumns={availableColumns} />
        </div>
      )}
    </>
  );
}

function PreferenceToggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span>{label}</span>
      <Switch aria-label={label} checked={checked} onChange={onChange} />
    </label>
  );
}

function RowHeights({
  preferences,
  onChange,
  t
}: Pick<LogResultOptionsContentProps, 'preferences' | 't'> & {
  onChange: LogResultOptionsContentProps['onPreferencesChange'];
}) {
  return (
    <fieldset className={styles.radioSection}>
      <legend>{t('explore.perses.rowHeight')}</legend>
      <div className={styles.heightOptions} role="radiogroup" aria-label={t('explore.perses.rowHeight')}>
        <Radio.Group
          value={preferences.rowHeight ?? 'small'}
          onChange={event =>
            onChange({
              ...preferences,
              rowHeight: event.target.value as NonNullable<ExploreLogDisplayPreferences['rowHeight']>
            })
          }
        >
          <Radio.Button value="small" aria-label={t('explore.perses.rowHeightSmall')}>
            S
          </Radio.Button>
          <Radio.Button value="medium" aria-label={t('explore.perses.rowHeightMedium')}>
            M
          </Radio.Button>
          <Radio.Button value="large" aria-label={t('explore.perses.rowHeightLarge')}>
            L
          </Radio.Button>
        </Radio.Group>
      </div>
    </fieldset>
  );
}

function DisplayModes({
  preferences,
  onChange,
  t
}: Pick<LogResultOptionsContentProps, 'preferences' | 't'> & {
  onChange: LogResultOptionsContentProps['onPreferencesChange'];
}) {
  return (
    <fieldset className={styles.radioSection}>
      <legend>{t('explore.perses.contentDisplay')}</legend>
      <div className={styles.displayModes} role="radiogroup" aria-label={t('explore.perses.contentDisplay')}>
        <Radio.Group
          value={preferences.contentDisplay ?? 'message'}
          onChange={event =>
            onChange({
              ...preferences,
              contentDisplay: event.target.value as NonNullable<ExploreLogDisplayPreferences['contentDisplay']>
            })
          }
        >
          <Radio value="message">{t('explore.perses.displayMessage')}</Radio>
          <Radio value="attributes">{t('explore.perses.displayAttributes')}</Radio>
          <Radio value="stack">{t('explore.perses.displayStack')}</Radio>
        </Radio.Group>
      </div>
    </fieldset>
  );
}
