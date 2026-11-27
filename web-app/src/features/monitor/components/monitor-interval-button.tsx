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

import { Button, InputNumber, Modal } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { monitorIntervalBounds } from '../model/monitor-editor-validation';

export function MonitorIntervalButton({
  count,
  pushOnly,
  disabled,
  apply
}: {
  count: number;
  pushOnly: boolean;
  disabled: boolean;
  apply: (seconds: number) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState<number | null>(null);
  const bounds = monitorIntervalBounds(pushOnly ? 'push' : undefined);
  const valid = seconds !== null && Number.isSafeInteger(seconds) && seconds >= bounds.min && seconds <= bounds.max;
  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => {
          setSeconds(null);
          setOpen(true);
        }}
      >
        {t('monitorActions.changeInterval')}
      </Button>
      <Modal
        open={open}
        title={t('monitorActions.changeInterval')}
        okText={t('common.confirm')}
        onCancel={() => setOpen(false)}
        okButtonProps={{ disabled: disabled || !valid }}
        onOk={() => {
          if (valid && !disabled) {
            setOpen(false);
            void apply(seconds);
          }
        }}
      >
        <p>{t('monitorActions.intervalHelp', { count, min: bounds.min, max: bounds.max })}</p>
        <InputNumber aria-label={t('monitor.editor.interval')} {...bounds} value={seconds} onChange={setSeconds} />
      </Modal>
    </>
  );
}
