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

import { Button, Select, Space, Typography } from 'antd';
import type { TFunction } from 'i18next';
import type { TelemetrySource } from '../model/explore-source';
import styles from './explore-source-selector.module.css';

type Props = {
  source: string;
  selfAccessible: boolean;
  state: string;
  t: TFunction;
  onChange: (source: TelemetrySource) => void;
  retry: () => void;
};

export function ExploreSourceSelector({ source, selfAccessible, state, t, onChange, retry }: Props) {
  const message = sourceMessage(source, state);
  return (
    <>
      <Space wrap data-telemetry-source={source}>
        <Typography.Text>{t('exploreSource.label')}</Typography.Text>
        <Select<TelemetrySource>
          aria-label={t('exploreSource.label')}
          value={source === 'self' || source === 'external' ? source : null}
          placeholder={t('exploreSource.invalid')}
          onChange={onChange}
          options={[
            { value: 'external', label: t('exploreSource.external') },
            { value: 'self', label: t('exploreSource.self'), disabled: !selfAccessible }
          ]}
        />
        {source === 'self' && state !== 'ready' && <Button onClick={retry}>{t('common.retry')}</Button>}
      </Space>
      {message && (
        <Typography.Text
          className={styles.hint ?? ''}
          role="status"
          data-telemetry-source-hint
          {...(message === 'selfHint' ? { title: t('exploreSource.selfDetails') } : {})}
        >
          {t(`exploreSource.${message}`)}
        </Typography.Text>
      )}
    </>
  );
}

function sourceMessage(source: string, state: string) {
  if (source !== 'external' && source !== 'self') return 'invalid';
  if (source === 'self') return state === 'ready' ? 'selfHint' : state;
  return state !== 'ready' && state !== 'loading' ? state : undefined;
}
