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

import type { MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import type { LogInspectorAnalysisControls, LogInspectorAnalysisIntent } from '../model/explore-log-inspector-analysis';
import { searchFieldName } from '../model/explore-log-search-authoring';
import type { InspectorField } from './explore-log-inspector-model';
import styles from './explore-log-inspector-fields.module.css';
export function logAnalysisMenuItems(
  field: InspectorField,
  controls: LogInspectorAnalysisControls,
  t: TFunction,
  close: () => void
): NonNullable<MenuProps['items']> {
  const target = field.analysis;
  if (!target || !controls.onAnalyzeLogField) return [];
  const reason = controls.logAnalysisDisabledReason;
  const intents: LogInspectorAnalysisIntent[] = ['graph', 'group'];
  const label = searchFieldName(target.field);
  return intents.map(intent => ({
    key: `analysis-${intent}`,
    disabled: Boolean(reason),
    label: (
      <span>
        {t(
          intent === 'graph'
            ? 'explore.logFieldMenu.graph'
            : intent === 'group'
              ? 'explore.logFieldMenu.groupBy'
              : 'explore.logFieldMenu.analyzeMeasure',
          {
            field: label
          }
        )}
        {reason && (
          <small className={styles.menuReason}>
            {t(
              reason === 'existing-analysis'
                ? 'explore.logFieldMenu.analysisExisting'
                : 'explore.logFieldMenu.analysisUnavailable'
            )}
          </small>
        )}
      </span>
    ),
    onClick: () => {
      if (controls.onAnalyzeLogField?.(target, intent)) close();
    }
  }));
}
