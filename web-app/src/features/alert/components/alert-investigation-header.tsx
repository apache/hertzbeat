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

import { Button, Tag } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { AlertInvestigationSnapshot } from '../model/alert-investigation-contract';
import type { AlertInvestigationRoute } from '../model/alert-investigation-route';
import styles from './alert-investigation-view.module.css';

type ReadyRoute = Extract<AlertInvestigationRoute, { kind: 'ready' }>;

export function AlertInvestigationHeader({
  route,
  snapshot,
  onBack
}: {
  route: ReadyRoute;
  snapshot: AlertInvestigationSnapshot;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: route.window.timeZone
  });
  return (
    <header className={styles.contextBand}>
      <div className={styles.headerCopy}>
        <h1 ref={heading} tabIndex={-1}>
          {snapshot.alert.name ?? t('alertInvestigation.unnamedAlert')}
        </h1>
        <div className={styles.headerMeta}>
          <Tag>{snapshot.alert.status ?? t('alertInvestigation.notRecorded')}</Tag>
          <Tag>{snapshot.alert.severity?.toUpperCase() ?? t('alertInvestigation.notRecorded')}</Tag>
          <span>{t('alertInvestigation.exactWindow')}</span>
          <time>{`${formatter.format(route.window.from)} – ${formatter.format(route.window.to)}`}</time>
          <span>{t('alertInvestigation.anchor')}</span>
          <time>{formatter.format(snapshot.window.anchor)}</time>
        </div>
        {snapshot.alert.summary ? <p>{snapshot.alert.summary}</p> : null}
      </div>
      <Button onClick={onBack}>{t('alertInvestigation.actions.back')}</Button>
    </header>
  );
}
