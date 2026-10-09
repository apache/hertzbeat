/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
