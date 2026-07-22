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

import { Checkbox, Input, Switch, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { noticeRuleWeekdays, type NoticeRuleDraft } from '../model/notice-rule-model';
import styles from './notice-rule-editor.module.css';

interface NoticeRuleAdvancedFieldsProps {
  draft: NoticeRuleDraft;
  update: (patch: Partial<NoticeRuleDraft>) => void;
  disabled: boolean;
}

/** Composes advanced presentation while the editor continues to own draft state. */
export function NoticeRuleAdvancedFields({ draft, update, disabled }: NoticeRuleAdvancedFieldsProps) {
  return (
    <div className={styles.advancedFields}>
      <NoticeRuleMatchFields draft={draft} update={update} disabled={disabled} />
      <NoticeRuleDeliveryWindow draft={draft} update={update} disabled={disabled} />
    </div>
  );
}

function NoticeRuleMatchFields({ draft, update, disabled }: NoticeRuleAdvancedFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <label className={styles.switchField}>
        <span>{t('noticeRules.forwardAll')}</span>
        <Switch disabled={disabled} checked={draft.filterAll} onChange={filterAll => update({ filterAll })} />
      </label>
      {!draft.filterAll && (
        <label className={styles.wideField}>
          {t('noticeRules.labels')}
          <Input.TextArea
            rows={2}
            disabled={disabled}
            value={draft.labelsText}
            placeholder={t('noticeRules.labelsPlaceholder')}
            onChange={event => update({ labelsText: event.target.value })}
          />
          <span className={styles.hint}>{t('noticeRules.labelsHelp')}</span>
        </label>
      )}
    </>
  );
}

function NoticeRuleDeliveryWindow({ draft, update, disabled }: NoticeRuleAdvancedFieldsProps) {
  const { t } = useTranslation();
  const changeDayLimit = (limitDays: boolean) => {
    if (limitDays) {
      update({ limitDays });
      return;
    }
    // Disabling the limit restores the canonical unrestricted week in the same patch.
    update({ limitDays, days: [1, 2, 3, 4, 5, 6, 7] });
  };

  return (
    <>
      <label className={styles.switchField}>
        <span>{t('noticeRules.limitDays')}</span>
        <Switch disabled={disabled} checked={draft.limitDays} onChange={changeDayLimit} />
      </label>
      {draft.limitDays && (
        <label className={styles.wideField}>
          {t('noticeRules.days')}
          <Checkbox.Group
            disabled={disabled}
            value={draft.days}
            options={noticeRuleWeekdays.map(day => ({ value: day, label: t(`noticeRules.week.${day}`) }))}
            onChange={days => update({ days })}
          />
        </label>
      )}
      <label className={styles.field}>
        {t('noticeRules.periodStart')}
        <TimePicker
          allowClear
          disabled={disabled}
          format="HH:mm"
          minuteStep={5}
          value={timeValue(draft.periodStart)}
          onChange={value => update({ periodStart: value?.format('HH:mm') ?? '' })}
        />
      </label>
      <label className={styles.field}>
        {t('noticeRules.periodEnd')}
        <TimePicker
          allowClear
          disabled={disabled}
          format="HH:mm"
          minuteStep={5}
          value={timeValue(draft.periodEnd)}
          onChange={value => update({ periodEnd: value?.format('HH:mm') ?? '' })}
        />
      </label>
      <span className={styles.hint}>{t('noticeRules.periodHelp')}</span>
    </>
  );
}

function timeValue(value: string) {
  if (!value) return null;
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours = Number.NaN, minutes = Number.NaN] = value.split(':').map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
}
