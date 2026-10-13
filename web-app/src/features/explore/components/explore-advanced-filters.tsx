/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Input } from 'antd';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import type { ExploreDraftField, ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { ExploreMetricFilters, ExploreMetricEssentialFilters } from './explore-metric-filters';
import { ExploreTraceFilters, ExploreTraceEssentialFilters } from './explore-trace-filters';
import { ExploreQueryField } from './explore-query-field';
import styles from './explore-query-bar.module.css';

type Props = Pick<ExploreSubmissionViewModel, 'draft' | 'errors' | 'updateField'> & {
  t: TFunction;
  metricRows?: boolean | undefined;
  appliedTraceView?: string | undefined;
};

export function ExploreGuidedFilters(props: Props) {
  const { draft, t } = props;
  return (
    <div className={styles.guidedFields} data-explore-essential-filters="">
      <ScopeField
        {...props}
        field="serviceName"
        label={t('explore.serviceName')}
        placeholder={t('explore.logQueryBuilder.serviceNameExample')}
      />
      <ScopeField
        {...props}
        field="environment"
        label={t('explore.environment')}
        placeholder={t('explore.logQueryBuilder.environmentExample')}
      />
      {draft.signal === 'metrics' && !props.metricRows && <ExploreMetricEssentialFilters {...props} draft={draft} />}
      {draft.signal === 'traces' && <ExploreTraceEssentialFilters {...props} draft={draft} />}
    </div>
  );
}

export function ExploreAdvancedFilters(props: Props) {
  const { draft, errors, t } = props;
  const count = advancedFilterCount(draft);
  const hiddenError = Boolean(errors.stepSeconds);
  const [disclosure, setDisclosure] = useState({ open: hiddenError, errors });
  if (disclosure.errors !== errors) {
    // Latch automatic opening so correcting an invalid field does not close it under focus.
    setDisclosure({ open: disclosure.open || hiddenError, errors });
  }
  return (
    <details className={styles.advanced} open={disclosure.open}>
      <summary
        aria-label={t('explore.advancedFilters')}
        onClick={event => {
          event.preventDefault();
          setDisclosure({ open: !disclosure.open, errors });
        }}
      >
        <span>{t('explore.advancedFilters')}</span>
        {count > 0 && <span className={styles.filterCount}>{count}</span>}
      </summary>
      <div className={styles.advancedFields} data-explore-advanced-fields="">
        <ScopeField
          {...props}
          field="serviceNamespace"
          label={t('explore.serviceNamespace')}
          placeholder={t('explore.logQueryBuilder.namespaceExample')}
        />
        <ScopeField {...props} field="instance" label={t('explore.instanceId')} />
        <ScopeField {...props} field="endpoint" label={t('explore.httpRouteTemplate')} />
        {draft.signal === 'metrics' && !props.metricRows && <ExploreMetricFilters {...props} draft={draft} />}
        {draft.signal === 'traces' && <ExploreTraceFilters {...props} draft={draft} />}
      </div>
    </details>
  );
}

function ScopeField({
  draft,
  updateField,
  field,
  label,
  placeholder
}: Props & {
  field: Extract<ExploreDraftField, 'serviceName' | 'serviceNamespace' | 'environment' | 'instance' | 'endpoint'>;
  label: string;
  placeholder?: string;
}) {
  return (
    <ExploreQueryField label={label}>
      <Input
        value={draft[field]}
        aria-label={label}
        placeholder={placeholder ?? label}
        onChange={event => updateField({ field, value: event.target.value })}
      />
    </ExploreQueryField>
  );
}

function advancedFilterCount(draft: Props['draft']) {
  const shared = [draft.serviceNamespace, draft.instance, draft.endpoint];
  const signal =
    draft.signal === 'metrics'
      ? [draft.metricFilter, draft.stepSeconds]
      : draft.signal === 'traces'
        ? [draft.traceId, draft.resourceFilter, draft.attributeFilter, draft.spanScope, draft.hideInternal]
        : [];
  return [...shared, ...signal].filter(value => value != null && value !== false && value !== '').length;
}
