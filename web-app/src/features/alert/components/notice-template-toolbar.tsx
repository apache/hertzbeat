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

import { Button, Input, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { SettingsNav } from '@/shared/settings/settings-nav';

import styles from '../alert-policy-page.module.css';
import pageStyles from '../notice-template-page.module.css';

type NoticeTemplateToolbarProps = {
  name: string;
  preset: boolean;
  onNameChange: (value: string) => void;
  onPresetChange: (preset: boolean) => void;
  onQuery: () => void;
  onRefresh: () => void;
  onCreate: () => void;
};

export function NoticeTemplateToolbar({
  name,
  preset,
  onNameChange,
  onPresetChange,
  onQuery,
  onRefresh,
  onCreate,
}: NoticeTemplateToolbarProps) {
  const { t } = useTranslation();

  return (
    <>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('noticeTemplates.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('noticeTemplates.description')}</Typography.Text>
        </div>
        <Button type="primary" onClick={onCreate}>
          {t('noticeTemplates.new')}
        </Button>
      </header>
      <SettingsNav />
      <div className={pageStyles.toolbar}>
        <Select
          aria-label={t('noticeTemplates.source')}
          value={preset ? 'preset' : 'custom'}
          options={[
            { value: 'preset', label: t('noticeTemplates.preset') },
            { value: 'custom', label: t('noticeTemplates.custom') },
          ]}
          onChange={(value) => onPresetChange(value === 'preset')}
        />
        <Input
          allowClear
          value={name}
          placeholder={t('noticeTemplates.search')}
          onChange={(event) => onNameChange(event.target.value)}
          onPressEnter={onQuery}
        />
        <Button type="primary" onClick={onQuery}>
          {t('common.query')}
        </Button>
        <Button onClick={onRefresh}>{t('common.refresh')}</Button>
      </div>
    </>
  );
}
