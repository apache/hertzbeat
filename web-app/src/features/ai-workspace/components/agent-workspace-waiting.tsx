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

import { LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import { agentExecutionPhase } from '../model/agent-execution-phase';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-workspace-waiting.module.css';

export function AgentWorkspaceWaiting({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const phase = agentExecutionPhase(controller);
  if (!phase) return null;
  return (
    <div className={styles.waiting} role="status" aria-live="polite" aria-atomic="true">
      <LoadingOutlined spin aria-hidden="true" />
      <span>{t(`aiWorkspace.waiting.${phase}`)}</span>
    </div>
  );
}
