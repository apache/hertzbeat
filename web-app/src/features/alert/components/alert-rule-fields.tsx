/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Input, InputNumber, Select, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertRuleDataType, AlertRuleDraft, AlertRuleKind } from '../alert-rule-model';
import styles from '../alert-rule-editor-page.module.css';

type AlertRuleFieldsProps = {
  draft: AlertRuleDraft;
  busy: boolean;
  update: (patch: Partial<AlertRuleDraft>) => void;
  changeKind: (kind: AlertRuleKind) => void;
};

export function AlertRuleFields(props: AlertRuleFieldsProps) {
  return (
    <div className={styles.form}>
      <AlertRuleStrategyFields {...props} />
      <AlertRuleDefinitionFields {...props} />
    </div>
  );
}

function AlertRuleStrategyFields({ draft, busy, update, changeKind }: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  const kinds: AlertRuleKind[] = ['realtime', 'periodic'];
  const dataTypes: AlertRuleDataType[] = draft.kind === 'periodic' ? ['metric', 'log', 'trace'] : ['metric', 'log'];
  return (
    <>
      <label>
        {t('alertRules.name')}
        <Input disabled={busy} value={draft.name} onChange={event => update({ name: event.target.value })} />
      </label>
      <label>
        {t('alertRules.kind.label')}
        <Select
          disabled={busy}
          value={draft.kind}
          onChange={changeKind}
          options={kinds.map(value => ({ value, label: t(`alertRules.kind.${value}`) }))}
        />
      </label>
      <label>
        {t('alertRules.dataType.label')}
        <Select
          disabled={busy}
          value={draft.dataType}
          onChange={dataType => update({ dataType })}
          options={dataTypes.map(value => ({ value, label: t(`alertRules.dataType.${value}`) }))}
        />
      </label>
      <label>
        {t('alertRules.enabled')}
        <Switch checked={draft.enable} disabled={busy} onChange={enable => update({ enable })} />
      </label>
    </>
  );
}

function AlertRuleDefinitionFields({ draft, busy, update }: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <label className={styles.wide}>
        {t('alertRules.expression')}
        <Input.TextArea
          disabled={busy}
          rows={5}
          value={draft.expr}
          onChange={event => update({ expr: event.target.value })}
        />
      </label>
      <label className={styles.wide}>
        {t('alertRules.template')}
        <Input.TextArea
          disabled={busy}
          rows={3}
          value={draft.template}
          onChange={event => update({ template: event.target.value })}
        />
      </label>
      <label className={styles.wide}>
        {t('alertRules.labels')}
        <Input
          disabled={busy}
          value={draft.labelsText}
          placeholder={t('alertRules.labelsPlaceholder')}
          onChange={event => update({ labelsText: event.target.value })}
        />
      </label>
      {draft.kind === 'periodic' && (
        <label>
          {t('alertRules.period')}
          <InputNumber disabled={busy} min={1} value={draft.period} onChange={period => update({ period })} />
        </label>
      )}
      <label>
        {t('alertRules.times')}
        <InputNumber disabled={busy} min={1} value={draft.times} onChange={times => update({ times })} />
      </label>
    </>
  );
}
