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

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, type OperationalStateKind } from '@/shared/operational-page/operational-page';

import styles from './route-state.module.css';

type RouteStatePlacement = 'content' | 'viewport';

export function RouteStateFrame({
  action,
  description,
  headingLevel,
  kind,
  placement = 'content',
  title
}: {
  action?: ReactNode | undefined;
  description?: ReactNode | undefined;
  headingLevel?: 1 | 2 | undefined;
  kind: OperationalStateKind;
  placement?: RouteStatePlacement | undefined;
  title: ReactNode;
}) {
  const stateTitle = headingLevel ? (
    <span role="heading" aria-level={headingLevel}>
      {title}
    </span>
  ) : (
    title
  );

  return (
    <div className={styles.frame} data-placement={placement} data-route-state-frame="">
      <OperationalStatePanel kind={kind} title={stateTitle} description={description} action={action} />
    </div>
  );
}

export function RouteLoadingState({ placement = 'content' }: { placement?: RouteStatePlacement | undefined }) {
  const { t } = useTranslation();
  return <RouteStateFrame kind="loading" placement={placement} title={t('common.loading')} />;
}
