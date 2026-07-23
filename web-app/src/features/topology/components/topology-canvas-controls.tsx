/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { AimOutlined, MinusOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from './topology-page.module.css';

type Props = {
  scale: number;
  refreshing: boolean;
  onFit: () => void;
  onRefresh: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function TopologyCanvasControls({ scale, refreshing, onFit, onRefresh, onZoomIn, onZoomOut }: Props) {
  const { t } = useTranslation();
  const scaleText = `${Number((scale * 100).toFixed(1))}%`;
  return (
    <Space.Compact className={styles.canvasControls}>
      <Button icon={<MinusOutlined />} aria-label={t('topology.canvas.zoomOut')} onClick={onZoomOut} />
      <Typography.Text className={styles.canvasScale!}>{scaleText}</Typography.Text>
      <Button icon={<PlusOutlined />} aria-label={t('topology.canvas.zoomIn')} onClick={onZoomIn} />
      <Button icon={<AimOutlined />} aria-label={t('topology.toolbar.fit')} onClick={onFit} />
      <Button icon={<ReloadOutlined />} aria-label={t('common.refresh')} loading={refreshing} onClick={onRefresh} />
    </Space.Compact>
  );
}
