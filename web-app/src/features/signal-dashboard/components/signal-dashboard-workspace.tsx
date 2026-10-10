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

import { useState } from 'react';
import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { addEmptyDashboardPanel } from '../model/signal-dashboard-panels';
import { SignalDashboardDefinition } from './signal-dashboard-definition';
import { SignalDashboardGrid } from './signal-dashboard-grid';
import styles from './signal-dashboard.module.css';

export function SignalDashboardWorkspace({ state, actions }: DashboardViewProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>();
  const ids = Object.keys(state.document?.spec.panels ?? {});
  const panelId = selected && ids.includes(selected) ? selected : ids[0];
  return (
    <div className={state.editor ? styles.editorWorkspace : styles.workspace}>
      {state.editor && (
        <aside className={styles.definition}>
          <SignalDashboardDefinition state={state} actions={actions} panelId={panelId} />
          <Button
            disabled={state.busy || state.editor.mode === 'upgrade' || ids.length >= 24}
            onClick={() => {
              const id = crypto.randomUUID();
              actions.update(addEmptyDashboardPanel(state.document!, id, t('signalDashboard.newPanel')));
              setSelected(id);
            }}
          >
            {t('signalDashboard.addPanel')}
          </Button>
          {state.validationError && (
            <Typography.Paragraph role="alert" type="danger">
              {t('signalDashboard.invalidDocument')}
            </Typography.Paragraph>
          )}
        </aside>
      )}
      <section className={styles.gridHost} aria-label={t('signalDashboard.panels')}>
        {ids.length ? (
          <SignalDashboardGrid state={state} actions={actions} select={setSelected} selected={panelId} />
        ) : (
          <Typography.Paragraph>{t('signalDashboard.noPanels')}</Typography.Paragraph>
        )}
      </section>
    </div>
  );
}
