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

import { Button, Popconfirm, Space, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertSilence } from './alert-silence-model';

export function AlertSilenceActions({ silence, busy, edit, toggle, remove }: {
  silence: AlertSilence; busy: boolean; edit: (id: number) => void;
  toggle: (silence: AlertSilence, enabled: boolean) => void; remove: (id: number) => void;
}) {
  const { t } = useTranslation();
  return <Space>
    <Switch checked={silence.enable === true} disabled={busy || typeof silence.enable !== 'boolean'}
      onChange={enabled => toggle(silence, enabled)} />
    <Button type="link" disabled={busy} onClick={() => edit(silence.id)}>{t('common.edit')}</Button>
    <Popconfirm title={t('alertSilences.deleteConfirm')} onConfirm={() => remove(silence.id)}>
      <Button type="link" danger disabled={busy}>{t('alertSilences.delete')}</Button>
    </Popconfirm>
  </Space>;
}
