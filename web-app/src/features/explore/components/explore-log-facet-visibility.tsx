/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';

import styles from './explore-log-result-toolbar.module.css';
import { LogFacetVisibilityContext } from './explore-log-facet-visibility-context';

export function LogFacetVisibilityButton() {
  const visibility = useContext(LogFacetVisibilityContext);
  const { t } = useTranslation();
  if (!visibility) return null;
  const label = t(visibility.visible ? 'explore.perses.hideFacets' : 'explore.perses.showFacets');
  return (
    <Button type="text" className={styles.facetToggle ?? ''} aria-label={label} onClick={visibility.toggle}>
      {visibility.visible ? <MenuFoldOutlined aria-hidden /> : <MenuUnfoldOutlined aria-hidden />}
      <span>{label}</span>
    </Button>
  );
}
