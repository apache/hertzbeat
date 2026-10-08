/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
