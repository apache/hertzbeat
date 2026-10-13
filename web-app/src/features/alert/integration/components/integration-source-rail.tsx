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

import { Typography } from 'antd';
import type { TFunction } from 'i18next';

import {
  alertIntegrationIconPath,
  alertIntegrationSourceGroups,
  type AlertIntegrationCatalogItem
} from '../model/alert-integration-model';
import styles from './integration.module.css';

export function IntegrationSourceRail(props: {
  sources: AlertIntegrationCatalogItem[];
  selected: string;
  t: TFunction;
  onSelect: (source: string) => void;
}) {
  return (
    <nav className={styles.rail} aria-label={props.t('alertIntegrations.sourcesLabel')}>
      <Typography.Title className={styles.railTitle!} level={2}>
        {props.t('alertIntegrations.sourcesLabel')}
      </Typography.Title>
      {alertIntegrationSourceGroups(props.sources).map(group => (
        <section className={styles.sourceGroup} key={group.readiness}>
          <div className={styles.sourceGroupLabel}>
            <span>{props.t(`alertIntegrations.sourceGroups.${group.readiness}`)}</span>
            <span className={styles.sourceGroupCount}>{group.sources.length}</span>
          </div>
          {group.sources.map(source => (
            <button
              key={source.source}
              type="button"
              className={source.source === props.selected ? `${styles.source} ${styles.sourceSelected}` : styles.source}
              aria-pressed={source.source === props.selected}
              onClick={() => props.onSelect(source.source)}
            >
              <img src={alertIntegrationIconPath(source.iconKey)} alt="" aria-hidden="true" />
              <span>{props.t(source.displayNameKey)}</span>
              {source.verification.status === 'verified' ? (
                <span
                  className={styles.sourceVerified}
                  title={props.t('alertIntegrations.verification.verifiedRail')}
                  aria-label={props.t('alertIntegrations.verification.verifiedRail')}
                />
              ) : null}
            </button>
          ))}
        </section>
      ))}
    </nav>
  );
}
