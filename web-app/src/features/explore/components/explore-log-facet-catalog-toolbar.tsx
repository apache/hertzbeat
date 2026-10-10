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

import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Select, Tooltip } from 'antd';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExploreLogFacetsProps } from './explore-log-facet-types';
import styles from './explore-log-facets.module.css';
export function FacetCatalogToolbar({
  data,
  hasCatalog,
  fieldOptions,
  chooseField
}: {
  data: ExploreLogFacetsProps['fields']['data'];
  hasCatalog: boolean;
  fieldOptions: { value: string; label: string }[];
  chooseField: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [addingField, setAddingField] = useState(false);
  const addButton = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  return (
    <>
      <div className={styles.catalogToolbar}>
        {data?.state === 'ready' && <FacetCatalogHelp data={data} />}
        <Button
          ref={addButton}
          className={styles.addField ?? ''}
          type="link"
          size="small"
          disabled={!hasCatalog}
          aria-expanded={addingField}
          onClick={() => setAddingField(open => !open)}
        >
          {t('explore.logFacets.core.add')}
        </Button>
      </div>
      {addingField && (
        <div className={styles.addFieldSelectRow}>
          <Select<string>
            showSearch
            aria-label={t('explore.logFacets.field')}
            placeholder={t('explore.logFacets.field')}
            value={null}
            disabled={!hasCatalog}
            options={fieldOptions}
            onChange={id => {
              chooseField(id);
              setAddingField(false);
              addButton.current?.focus();
            }}
            onInputKeyDown={event => {
              if (event.key !== 'Escape') return;
              setAddingField(false);
              addButton.current?.focus();
            }}
          />
        </div>
      )}
    </>
  );
}

function FacetCatalogHelp({ data }: { data: NonNullable<ExploreLogFacetsProps['fields']['data']> }) {
  const { t } = useTranslation();
  if (data.state !== 'ready') return null;
  return (
    <Tooltip
      title={
        <>
          {t('explore.logFacets.discovery', { count: data.coverage.scannedRows, limit: data.coverage.rowLimit })}{' '}
          {(data.truncated || data.coverage.hasMore) && t('explore.logFacets.limited')}
        </>
      }
      trigger={['hover', 'focus']}
    >
      <button className={styles.help} type="button" aria-label={t('explore.logFacets.discoveryHelp')}>
        <InfoCircleOutlined />
      </button>
    </Tooltip>
  );
}
