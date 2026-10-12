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

import { useTranslation } from 'react-i18next';

import type { EntitySignalViewState } from '../model/entity-signal-view-model';
import styles from './entity-signal-view.module.css';

type BoundMonitorState = Extract<EntitySignalViewState, { kind: 'ready' }>['boundMonitors'];

export function EntitySignalBoundMonitorState({ state }: { state: BoundMonitorState }) {
  const { t } = useTranslation();
  if (state.state === 'unknown') {
    return <div className={styles.compactState}>{t('entity.signals.boundMonitorsState.unknown')}</div>;
  }
  if (state.total === 0) {
    return <div className={styles.compactState}>{t('entity.signals.boundMonitorsState.empty')}</div>;
  }
  return (
    <div className={styles.nameList}>
      <strong>{t('entity.signals.items', { count: state.total })}</strong>
      {state.names.map(name => (
        <span key={name}>{name}</span>
      ))}
    </div>
  );
}
