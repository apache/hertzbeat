/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Checkbox, DatePicker, Radio, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { changeAlertSilenceType, type AlertSilenceDraft, type AlertSilenceType } from '../model/alert-silence-model';
import styles from '../shared/alert-silence-editor.module.css';

const weekdayOrder = [7, 1, 2, 3, 4, 5, 6] as const;

interface ScheduleWindowProps {
  draft: AlertSilenceDraft;
  disabled: boolean;
  update: (patch: Partial<AlertSilenceDraft>) => void;
}

interface AlertSilenceScheduleFieldsProps extends ScheduleWindowProps {
  replace: (draft: AlertSilenceDraft) => void;
}

/** Owns schedule presentation while type normalization remains in the model. */
export function AlertSilenceScheduleFields({ draft, disabled, update, replace }: AlertSilenceScheduleFieldsProps) {
  const { t } = useTranslation();
  const changeType = (type: AlertSilenceType) => replace(changeAlertSilenceType(draft, type));

  return (
    <>
      <label className={`${styles.field} ${styles.wide}`}>
        {t('alertSilences.type')}
        <Radio.Group
          disabled={disabled}
          optionType="button"
          buttonStyle="solid"
          value={draft.type}
          options={[
            { value: 0, label: t('alertSilences.once') },
            { value: 1, label: t('alertSilences.recurring') }
          ]}
          onChange={event => changeType(event.target.value as AlertSilenceType)}
        />
      </label>
      {draft.type === 0 ? (
        <AlertSilenceOnceWindow draft={draft} disabled={disabled} update={update} />
      ) : (
        <AlertSilenceRecurringWindow draft={draft} disabled={disabled} update={update} />
      )}
    </>
  );
}

function AlertSilenceOnceWindow({ draft, disabled, update }: ScheduleWindowProps) {
  const { t } = useTranslation();

  return (
    <label className={`${styles.field} ${styles.wide}`}>
      {t('alertSilences.timeWindow')}
      <DatePicker.RangePicker
        disabled={disabled}
        showTime={{ format: 'HH:mm' }}
        format="YYYY-MM-DD HH:mm"
        value={[dayjs(draft.periodStart), dayjs(draft.periodEnd)]}
        onChange={range => {
          if (!range?.[0] || !range[1]) return;
          update({
            periodStart: range[0].format('YYYY-MM-DDTHH:mm'),
            periodEnd: range[1].format('YYYY-MM-DDTHH:mm')
          });
        }}
      />
    </label>
  );
}

function AlertSilenceRecurringWindow({ draft, disabled, update }: ScheduleWindowProps) {
  const { t } = useTranslation();

  return (
    <>
      <label className={`${styles.field} ${styles.wide} ${styles.weekdays}`}>
        {t('alertSilences.days')}
        <Checkbox.Group
          disabled={disabled}
          value={draft.days}
          options={weekdayOrder.map(day => ({ value: day, label: t(`alertSilences.week.${day}`) }))}
          onChange={days => update({ days })}
        />
      </label>
      <label className={styles.field}>
        {t('alertSilences.start')}
        <TimePicker
          disabled={disabled}
          format="HH:mm"
          minuteStep={5}
          value={timePickerValue(draft.periodStart)}
          onChange={value => value && update({ periodStart: value.format('HH:mm') })}
        />
      </label>
      <label className={styles.field}>
        {t('alertSilences.end')}
        <TimePicker
          disabled={disabled}
          format="HH:mm"
          minuteStep={5}
          value={timePickerValue(draft.periodEnd)}
          onChange={value => value && update({ periodEnd: value.format('HH:mm') })}
        />
      </label>
      <span className={`${styles.hint} ${styles.wide}`}>{t('alertSilences.crossMidnightHelp')}</span>
    </>
  );
}

function timePickerValue(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
}
