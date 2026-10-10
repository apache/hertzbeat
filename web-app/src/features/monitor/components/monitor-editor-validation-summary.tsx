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

import { Alert } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { MonitorParamDefine } from '../model/monitor-contract';

export function MonitorEditorValidationSummary({
  issues,
  defines,
  language
}: {
  issues: string[];
  defines: MonitorParamDefine[];
  language: string;
}) {
  const { t } = useTranslation();
  if (issues.length === 0) return null;
  return (
    <Alert
      type="error"
      showIcon
      message={t('monitor.editor.validation')}
      description={
        <ul>
          {issues.map(issue => (
            <li key={issue}>{validationIssueLabel(issue, defines, language, t)}</li>
          ))}
        </ul>
      }
    />
  );
}

function validationIssueLabel(issue: string, defines: MonitorParamDefine[], language: string, translate: TFunction) {
  if (issue === 'app') return translate('monitor.application');
  if (issue === 'name') return translate('monitor.name');
  if (issue === 'intervals') return translate('monitor.editor.interval');
  if (issue === 'cronExpression') return translate('monitor.editor.cronExpression');
  if (issue === 'param:__labels') return translate('monitor.editor.labels');
  if (issue === 'param:__annotations') return translate('monitor.editor.annotations');
  const field = issue.startsWith('param:') ? issue.slice(6) : issue;
  const define = defines.find(item => item.field === field);
  return define?.name[language] ?? define?.name['en-US'] ?? field;
}
