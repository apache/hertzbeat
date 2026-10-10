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

import { Button, Input, Modal } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../shared/alert-rule-list.module.css';

export function AlertRuleExpressionCell({ value, name }: { value: string | null; name: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!value) return '—';
  return (
    <>
      <Button
        type="link"
        className={styles.expressionButton ?? ''}
        aria-label={`${t('alertRules.expression')}: ${name}`}
        title={value}
        onClick={() => setOpen(true)}
      >
        {value}
      </Button>
      <Modal title={t('alertRules.expression')} open={open} onCancel={() => setOpen(false)} footer={null} width={680}>
        <Input.TextArea aria-label={t('alertRules.expression')} value={value} readOnly autoFocus rows={10} />
      </Modal>
    </>
  );
}
