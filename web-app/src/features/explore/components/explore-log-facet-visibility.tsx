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
