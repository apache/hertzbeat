/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { AlertRuleDatasourceState, AlertRuleKind } from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleDatasourceEvidence } from './alert-rule-editor-evidence';

export function AlertRuleTypeChooser(props: {
  datasource: AlertRuleDatasourceState;
  choose: (kind: AlertRuleKind) => void;
}) {
  const { t } = useTranslation();
  const realtimeTitleId = useId();
  const realtimeDescriptionId = useId();
  const periodicTitleId = useId();
  const periodicDescriptionId = useId();
  const periodicAvailable =
    props.datasource.kind === 'ready' &&
    (props.datasource.status.hasPromqlExecutor || props.datasource.status.hasSqlExecutor);
  return (
    <section className={styles.typeChooser} aria-label={t('alertRules.typeChoice.title')}>
      <Button
        aria-describedby={realtimeDescriptionId}
        aria-labelledby={realtimeTitleId}
        className={styles.typeChoice ?? ''}
        onClick={() => props.choose('realtime')}
      >
        <ThunderboltOutlined className={styles.typeChoiceIcon} />
        <span className={styles.typeChoiceContent}>
          <strong id={realtimeTitleId}>{t('alertRules.kind.realtime')}</strong>
          <small id={realtimeDescriptionId}>{t('alertRules.typeChoice.realtimeDescription')}</small>
        </span>
      </Button>
      <Button
        aria-describedby={periodicDescriptionId}
        aria-labelledby={periodicTitleId}
        className={styles.typeChoice ?? ''}
        disabled={!periodicAvailable}
        onClick={() => props.choose('periodic')}
      >
        <ClockCircleOutlined className={styles.typeChoiceIcon} />
        <span className={styles.typeChoiceContent}>
          <strong id={periodicTitleId}>{t('alertRules.kind.periodic')}</strong>
          <small id={periodicDescriptionId}>
            {t(
              periodicAvailable
                ? 'alertRules.typeChoice.periodicDescription'
                : 'alertRules.typeChoice.periodicUnavailable'
            )}
          </small>
        </span>
      </Button>
    </section>
  );
}

export function AlertRuleTypeChooserDialog(props: {
  datasource: AlertRuleDatasourceState;
  onCancel: () => void;
  onChoose: (kind: AlertRuleKind) => void;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <Modal open title={t('alertRules.typeChoice.title')} width={500} footer={null} onCancel={props.onCancel}>
      <div className={styles.typeChooserDialogBody}>
        <AlertRuleDatasourceEvidence state={props.datasource} retry={props.retry} />
        <AlertRuleTypeChooser
          datasource={props.datasource}
          choose={kind => {
            props.onChoose(kind);
            props.onCancel();
          }}
        />
      </div>
    </Modal>
  );
}
