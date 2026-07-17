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

import { Button, Input, Typography } from "antd";
import { useTranslation } from "react-i18next";

import { SettingsNav } from '@/shared/settings/settings-nav';

import styles from "../../alert-policy-page.module.css";

type NoticeRuleToolbarProps = {
  name: string;
  createDisabled: boolean;
  onNameChange: (value: string) => void;
  onQuery: () => void;
  onRefresh: () => void;
  onCreate: () => void;
};

export function NoticeRuleToolbar(props: NoticeRuleToolbarProps) {
  const { t } = useTranslation();
  return (
    <>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t("noticeRules.title")}</Typography.Title>
          <Typography.Text type="secondary">{t("noticeRules.description")}</Typography.Text>
        </div>
        <Button type="primary" disabled={props.createDisabled} onClick={props.onCreate}>
          {t("noticeRules.new")}
        </Button>
      </header>
      <SettingsNav />
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={props.name}
          placeholder={t("noticeRules.search")}
          onChange={(event) => props.onNameChange(event.target.value)}
          onPressEnter={props.onQuery}
        />
        <Button type="primary" onClick={props.onQuery}>
          {t("common.query")}
        </Button>
        <Button onClick={props.onRefresh}>{t("common.refresh")}</Button>
      </div>
    </>
  );
}
