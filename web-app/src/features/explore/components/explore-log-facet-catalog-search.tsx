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

import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './explore-log-facets.module.css';

export function FacetFieldSearch({
  options,
  enabled,
  onFieldChange
}: {
  options: { value: string; label: string }[];
  enabled: boolean;
  onFieldChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const matches = term ? options.filter(field => `${field.label} ${field.value}`.toLowerCase().includes(term)) : [];
  return (
    <>
      <div className={styles.catalogSearchRow}>
        <Input
          className={styles.catalogSearch}
          prefix={<SearchOutlined aria-hidden />}
          allowClear
          aria-label={t('explore.logFacets.searchFields')}
          placeholder={t('explore.logFacets.searchFields')}
          value={search}
          disabled={!enabled}
          onChange={event => setSearch(event.target.value)}
        />
      </div>
      {term && enabled && (
        <ul className={styles.fieldMatches} aria-label={t('explore.logFacets.searchFields')}>
          {matches.slice(0, 8).map(field => (
            <li key={field.value}>
              <button
                type="button"
                onClick={() => {
                  onFieldChange(field.value);
                  setSearch('');
                }}
              >
                {field.label}
              </button>
            </li>
          ))}
          {!matches.length && <li role="status">{t('explore.logFacets.searchFieldsEmpty')}</li>}
        </ul>
      )}
    </>
  );
}
