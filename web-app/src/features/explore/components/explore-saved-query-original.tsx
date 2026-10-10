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
import { useTranslation } from 'react-i18next';
import { saveBrowserDownload } from '@/shared/browser-download';
import type { SavedQueryRecord } from '../model/explore-saved-query-model';
import styles from './explore-saved-queries.module.css';
export function SavedQueryOriginal({ record, onClose }: { record: SavedQueryRecord | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal
      open={Boolean(record)}
      title={t('exploreSaved.original')}
      onCancel={onClose}
      footer={
        <Button
          onClick={() =>
            record &&
            saveBrowserDownload({
              data: new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }),
              filename: `saved-query-${record.signal}-${record.viewKey}.json`
            })
          }
        >
          {t('exploreSaved.export')}
        </Button>
      }
    >
      <pre className={styles.original}>{JSON.stringify(record, null, 2)}</pre>
    </Modal>
  );
}
