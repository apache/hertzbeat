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

import { Button, Modal } from 'antd';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useEvidenceCopy } from './explore-evidence-copy';
import styles from './explore-log-inspector-fields.module.css';

export function InspectorValue({ fieldKey, value, preview }: { fieldKey: string; value: string; preview?: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { copy, status } = useEvidenceCopy(value);
  return (
    <>
      <span className={styles.valuePreview}>{preview ?? value}</span>
      <Button type="link" className={styles.viewFull ?? ''} onClick={() => setOpen(true)}>
        {t('explore.logFieldMenu.viewFull')}
      </Button>
      <Modal
        title={fieldKey}
        width={880}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void copy()}
        okText={t('explore.logFieldMenu.copy')}
        destroyOnHidden
      >
        <pre className={styles.fullValue} tabIndex={0}>
          {value}
        </pre>
        <span role="status">{status === 'idle' ? '' : t(`explore.logFieldMenu.${status}`)}</span>
      </Modal>
    </>
  );
}
