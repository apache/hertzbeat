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

import { useTranslation } from 'react-i18next';

import { InvestigationBlockState, InvestigationSection } from './explore-investigation-view-primitives';

export function InvestigationLogTopology({
  evidenceCurrent,
  onOpen
}: {
  evidenceCurrent: boolean;
  onOpen?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <InvestigationSection
      title={t('exploreInvestigation.sections.topology')}
      action={onOpen}
      actionLabel={t('exploreInvestigation.actions.openTopology')}
      evidenceCurrent={evidenceCurrent}
    >
      {onOpen ? <p>{t('exploreInvestigation.topology.logScope')}</p> : <InvestigationBlockState state="unavailable" />}
    </InvestigationSection>
  );
}
