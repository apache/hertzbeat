/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, InputNumber, Select, Space, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { TopologyPageController } from '../controller/use-topology-page-controller';
import { topologyDepthValues, type TopologyQuery, type TopologyScopePatch } from '../model/topology-model';
import styles from './topology-page.module.css';

type Props = {
  query: TopologyQuery;
  refreshing: boolean;
  changeScope: TopologyPageController['actions']['changeScope'];
  onFit: () => void;
  onRefresh: () => void;
};

export function TopologyToolbar({ query, refreshing, changeScope, onFit, onRefresh }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <InputNumber
        min={1}
        max={Number.MAX_SAFE_INTEGER}
        precision={0}
        step={1}
        value={query.focusEntityId}
        aria-label={t('topology.toolbar.focusEntity')}
        placeholder={t('topology.toolbar.focusEntity')}
        onChange={value => changeScope({ focusEntityId: normalizeFocusEntityId(value) })}
      />
      <Select
        value={query.depth}
        aria-label={t('topology.toolbar.depth')}
        options={topologyDepthValues.map(value => ({ value, label: `${t('topology.toolbar.depth')} ${value}` }))}
        onChange={depth => changeScope({ depth })}
      />
      <ScopeInput
        key={`environment:${query.environment ?? ''}`}
        field="environment"
        value={query.environment}
        changeScope={changeScope}
      />
      <ScopeInput
        key={`sourceKind:${query.sourceKind ?? ''}`}
        field="sourceKind"
        value={query.sourceKind}
        changeScope={changeScope}
      />
      <ScopeInput
        key={`relationType:${query.relationType ?? ''}`}
        field="relationType"
        value={query.relationType}
        changeScope={changeScope}
      />
      <Space size={6}>
        <Switch
          checked={query.hideInternal ?? false}
          aria-label={t('topology.toolbar.hideInternal')}
          onChange={hideInternal => changeScope({ hideInternal })}
        />
        <Typography.Text>{t('topology.toolbar.hideInternal')}</Typography.Text>
      </Space>
      <div className={styles.toolbarActions}>
        <Button onClick={onFit}>{t('topology.toolbar.fit')}</Button>
        <Button loading={refreshing} onClick={onRefresh}>
          {t('common.refresh')}
        </Button>
      </div>
    </div>
  );
}

function normalizeFocusEntityId(value: number | null) {
  if (typeof value !== 'number') return undefined;
  const normalized = Math.trunc(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : undefined;
}

function ScopeInput({
  field,
  value,
  changeScope
}: {
  field: 'environment' | 'sourceKind' | 'relationType';
  value: string | undefined;
  changeScope: (patch: TopologyScopePatch) => void;
}) {
  const { t } = useTranslation();
  return (
    <Input
      allowClear
      defaultValue={value}
      aria-label={t(`topology.toolbar.${field}`)}
      placeholder={t(`topology.toolbar.${field}`)}
      onBlur={event => changeScope({ [field]: event.target.value.trim() || undefined })}
      onPressEnter={event => event.currentTarget.blur()}
    />
  );
}
