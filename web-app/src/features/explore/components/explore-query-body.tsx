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

import type { TFunction } from 'i18next';
import { useState, type FormEvent, type ReactNode } from 'react';

import type { ExploreQuery } from '../model/explore-model';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import layout from './explore-query-layout.module.css';

type Props = {
  query: ExploreQuery;
  draft: ExploreSubmissionViewModel['draft'];
  facets?: ReactNode;
  activeFilters?: ReactNode;
  results?: ReactNode;
  children: ReactNode;
  submit: (event: FormEvent) => void;
  t: TFunction;
};

export function ExploreQueryBody({ query, draft, facets, activeFilters, results, children, submit, t }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const traceFilters = showTraceBasics(Boolean(results), query, draft);
  const compactLogFilters = Boolean(results) && query.signal === 'logs';
  return (
    <div className={results ? layout.queryBody : undefined}>
      {compactLogFilters && (
        <button
          type="button"
          className={layout.mobileFiltersToggle}
          aria-controls="explore-log-filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          {t('explore.addFilters')}
        </button>
      )}
      <form
        id={compactLogFilters ? 'explore-log-filters' : undefined}
        className={results ? layout.filterRail : undefined}
        data-trace-filter-rail={traceFilters || undefined}
        aria-label={t('explore.addFilters')}
        data-mobile-collapsible={compactLogFilters || undefined}
        data-mobile-open={compactLogFilters ? filtersOpen : undefined}
        onSubmit={submit}
      >
        {showFilterHeading(Boolean(results), query, facets, draft) && <h3>{t('explore.addFilters')}</h3>}
        {activeFilters}
        {traceFilters ? (
          <>
            <section className={layout.traceBasics} aria-label={t('exploreTrace.layout.basicFilters')}>
              <h3>{t('exploreTrace.layout.basicFilters')}</h3>
              {children}
            </section>
            {facets}
          </>
        ) : (
          <>
            {facets}
            {children}
          </>
        )}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
      {results}
    </div>
  );
}

function showFilterHeading(
  hasResults: boolean,
  query: ExploreQuery,
  facets: ReactNode,
  draft: ExploreSubmissionViewModel['draft']
) {
  return (
    hasResults &&
    !(query.signal !== 'metrics' && facets) &&
    (draft.signal !== 'traces' || draft.traceStructure === undefined)
  );
}

function showTraceBasics(hasResults: boolean, query: ExploreQuery, draft: Props['draft']) {
  return hasResults && query.signal === 'traces' && draft.signal === 'traces' && draft.traceStructure === undefined;
}
