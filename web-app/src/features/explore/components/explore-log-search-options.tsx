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
import type { LogSearchSuggestion, LogSearchSuggestions } from '../model/explore-log-search-authoring';
import type { RecentLogSearch } from '../model/explore-recent-log-searches';
import styles from './explore-log-search-options.module.css';

export function SearchOptions({
  options,
  selected,
  prefix,
  id,
  accept,
  suggestions,
  recentQueries,
  restoreRecentQuery,
  t
}: {
  options: LogSearchSuggestion[];
  selected: number;
  prefix: string;
  id: string;
  accept: (index: number) => void;
  suggestions: LogSearchSuggestions | undefined;
  recentQueries: RecentLogSearch[];
  restoreRecentQuery: (entry: RecentLogSearch) => void;
  t: TFunction;
}) {
  return (
    <div className={styles.popup} data-log-command-skip-submit>
      <ul id={id} role="listbox" aria-label={t('explore.logAuthoring.suggestions')} className={styles.options}>
        {options.map((option, index) => (
          <SearchOption
            key={option.value}
            option={option}
            selected={index === selected}
            prefix={prefix}
            id={`${id}-${index}`}
            accept={() => accept(index)}
            t={t}
          />
        ))}
      </ul>
      {!options.length && !recentQueries.length && (
        <p role="status">
          {t(
            `explore.logAuthoring.${suggestions?.state === 'loading' ? 'loading' : suggestions?.state === 'unavailable' ? 'unavailable' : 'empty'}`
          )}
        </p>
      )}
      {recentQueries.length > 0 && <RecentQueries {...{ recentQueries, restoreRecentQuery, t }} />}
      <div className={styles.help}>
        <p>{t('explore.logAuthoring.scope')}</p>
        <p>{t('explore.logAuthoring.keyboard')}</p>
      </div>
    </div>
  );
}

function highlightSuggestion(label: string, prefix: string) {
  if (!prefix) return label;
  const foldedPrefix = prefix.toLowerCase();
  const matchStart = label.toLowerCase().indexOf(foldedPrefix);
  if (matchStart < 0) return label;
  const matchEnd = matchStart + foldedPrefix.length;
  let sourceOffset = 0;
  let foldedOffset = 0;
  let start = -1;
  let end = -1;
  // Lowercasing can expand UTF-16 length; map boundaries to whole original code points.
  for (const character of label) {
    const nextFoldedOffset = foldedOffset + character.toLowerCase().length;
    if (start < 0 && matchStart < nextFoldedOffset) start = sourceOffset;
    sourceOffset += character.length;
    if (matchEnd <= nextFoldedOffset) {
      end = sourceOffset;
      break;
    }
    foldedOffset = nextFoldedOffset;
  }
  if (start < 0 || end < 0) return label;
  return (
    <>
      {label.slice(0, start)}
      <mark className={styles.match}>{label.slice(start, end)}</mark>
      {label.slice(end)}
    </>
  );
}

function SearchOption({
  option,
  selected,
  prefix,
  id,
  accept,
  t
}: {
  option: LogSearchSuggestion;
  selected: boolean;
  prefix: string;
  id: string;
  accept: () => void;
  t: TFunction;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        id={id}
        aria-selected={selected}
        aria-label={[option.condition ?? option.label, option.count?.toLocaleString()].filter(Boolean).join(' ')}
        aria-describedby={`${id}-kind`}
        className={styles.option}
        onMouseDown={event => event.preventDefault()}
        onClick={() => accept()}
      >
        <span id={`${id}-kind`} className={styles.kind}>
          {t(`explore.logAuthoring.${option.fieldValue ? 'fieldValue' : 'fieldName'}`)}
        </span>
        <span className={styles.label}>{highlightSuggestion(option.condition ?? option.label, prefix)}</span>
        <span>{option.count?.toLocaleString()}</span>
      </button>
    </li>
  );
}

function RecentQueries({
  recentQueries,
  restoreRecentQuery,
  t
}: {
  recentQueries: RecentLogSearch[];
  restoreRecentQuery: (entry: RecentLogSearch) => void;
  t: TFunction;
}) {
  return (
    <>
      <p className={styles.recentTitle}>{t('explore.recentLogs.title')}</p>
      <ul className={styles.options} aria-label={t('explore.recentLogs.title')}>
        {recentQueries.slice(0, 3).map((entry, index) => (
          <li key={`${entry.executedAt}-${index}`}>
            <button
              type="button"
              className={styles.option}
              aria-label={entry.query || t('explore.recentLogs.all')}
              onMouseDown={event => event.preventDefault()}
              onClick={() => restoreRecentQuery(entry)}
            >
              <span className={styles.label}>{entry.query || t('explore.recentLogs.all')}</span>
              <span className={styles.recentStatus}>{t('explore.recentLogs.statusUnknown')}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
