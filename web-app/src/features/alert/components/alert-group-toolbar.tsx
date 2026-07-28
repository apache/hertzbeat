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

import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../shared/alert-policy-page.module.css';

export function AlertGroupToolbar({
  refreshing,
  search,
  setSearch,
  submitSearch,
  refresh
}: {
  refreshing: boolean;
  search: string;
  setSearch: (value: string) => void;
  submitSearch: () => void;
  refresh: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <Input
        allowClear
        value={search}
        placeholder={t('alertGroups.search')}
        onChange={event => setSearch(event.target.value)}
        onPressEnter={submitSearch}
      />
      <Button type="primary" onClick={submitSearch}>
        {t('common.query')}
      </Button>
      <Button loading={refreshing} onClick={() => void refresh()}>
        {t('common.refresh')}
      </Button>
    </div>
  );
}
