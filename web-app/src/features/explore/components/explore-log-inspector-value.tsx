/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
