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

import { Checkbox, DatePicker, Input, Modal, Radio, Switch, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { changeAlertSilenceType, type AlertSilenceDraft, type AlertSilenceType } from './alert-silence-model';
import styles from './alert-silence-editor.module.css';

const weekdays = [7, 1, 2, 3, 4, 5, 6] as const;

function timePickerValue(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
}

function AlertSilenceScheduleFields({ draft, update, replace }: {
  draft: AlertSilenceDraft;
  update: (patch: Partial<AlertSilenceDraft>) => void;
  replace: (draft: AlertSilenceDraft) => void;
}) {
  const { t } = useTranslation();
  const changeType = (type: AlertSilenceType) => replace(changeAlertSilenceType(draft, type));
  return (
    <>
      <label className={`${styles.field} ${styles.wide}`}>
        {t('alertSilences.type')}
        <Radio.Group
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
      {draft.type === 1 && (
        <label className={`${styles.field} ${styles.wide} ${styles.weekdays}`}>
          {t('alertSilences.days')}
          <Checkbox.Group
            value={draft.days}
            options={weekdays.map(day => ({ value: day, label: t(`alertSilences.week.${day}`) }))}
            onChange={days => update({ days })}
          />
        </label>
      )}
      {draft.type === 0 ? (
        <label className={`${styles.field} ${styles.wide}`}>
          {t('alertSilences.timeWindow')}
          <DatePicker.RangePicker
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            value={[dayjs(draft.periodStart), dayjs(draft.periodEnd)]}
            onChange={range => {
              if (range?.[0] && range[1]) {
                update({
                  periodStart: range[0].format('YYYY-MM-DDTHH:mm'),
                  periodEnd: range[1].format('YYYY-MM-DDTHH:mm')
                });
              }
            }}
          />
        </label>
      ) : (
        <>
          <label className={styles.field}>
            {t('alertSilences.start')}
            <TimePicker format="HH:mm" minuteStep={5} value={timePickerValue(draft.periodStart)} onChange={value => value && update({ periodStart: value.format('HH:mm') })} />
          </label>
          <label className={styles.field}>
            {t('alertSilences.end')}
            <TimePicker format="HH:mm" minuteStep={5} value={timePickerValue(draft.periodEnd)} onChange={value => value && update({ periodEnd: value.format('HH:mm') })} />
          </label>
        </>
      )}
      {draft.type === 1 && <span className={`${styles.hint} ${styles.wide}`}>{t('alertSilences.crossMidnightHelp')}</span>}
    </>
  );
}

export function AlertSilenceEditor({ draft, saving, update, replace, close, submit }: {
  draft: AlertSilenceDraft;
  saving: boolean;
  update: (patch: Partial<AlertSilenceDraft>) => void;
  replace: (draft: AlertSilenceDraft) => void;
  close: () => void;
  submit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      width={680}
      maskClosable={false}
      title={t(draft.id ? 'alertSilences.edit' : 'alertSilences.new')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      onCancel={close}
      onOk={submit}
    >
      <div className={styles.form}>
        <label className={`${styles.field} ${styles.wide}`}>
          {t('alertSilences.name')}
          <Input value={draft.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <label className={styles.field}>
          {t('alertSilences.matchAll')}
          <Switch checked={draft.matchAll} onChange={matchAll => update({ matchAll })} />
        </label>
        <label className={styles.field}>
          {t('alertSilences.enabled')}
          <Switch checked={draft.enable} onChange={enable => update({ enable })} />
        </label>
        {!draft.matchAll && (
          <label className={`${styles.field} ${styles.wide}`}>
            {t('alertSilences.labels')}
            <Input.TextArea rows={2} value={draft.labelsText} placeholder={t('alertSilences.matcherPlaceholder')} onChange={event => update({ labelsText: event.target.value })} />
            <span className={styles.hint}>{t('alertSilences.labelsHelp')}</span>
          </label>
        )}
        <AlertSilenceScheduleFields draft={draft} update={update} replace={replace} />
      </div>
    </Modal>
  );
}
