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

import { useRef, type ReactNode } from 'react';
import type { EditorView } from '@codemirror/view';
import { useLogSearchEditor } from './use-log-search-editor';
import { useLogSearchInput } from './use-log-search-input';
import { Button, Popover } from 'antd';
import type { TFunction } from 'i18next';
import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';
import { QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons';
import styles from './explore-log-search-input.module.css';
import { SearchOptions } from './explore-log-search-options';
import { isStructuredLogSyntax } from '../model/explore-log-structured-syntax';
import type { RecentLogSearch } from '../model/explore-recent-log-searches';

type Props = {
  invalid?: boolean | undefined;
  errorId?: string | undefined;
  value: string;
  syntax: string | undefined;
  onChange: (value: string) => void;
  onSubmit?: (() => void) | undefined;
  onBlurSubmit?: boolean | undefined;
  suggestions?: LogSearchSuggestions | undefined;
  suggestedService?: string | undefined;
  recentQueries?: RecentLogSearch[] | undefined;
  restoreRecentQuery?: ((entry: RecentLogSearch) => void) | undefined;
  recent?: ReactNode;
  t: TFunction;
};
export function ExploreLogSearchInput(props: Props) {
  const { value, syntax, suggestions, suggestedService, recentQueries = [], restoreRecentQuery, recent, t } = props;
  const view = useRef<EditorView | null>(null);
  const completion = useLogSearchInput(props, view);
  const host = useLogSearchEditor({
    value,
    syntax,
    suggestedService,
    t,
    viewRef: view,
    completion,
    invalid: props.invalid,
    errorId: props.errorId
  });
  const { options, selected, id, accept } = completion;
  return (
    <div className={styles.authoring} data-log-search-syntax={syntax || 'literal'}>
      <Popover
        open={completion.open}
        placement="bottomLeft"
        align={{ overflow: { shiftX: true, adjustX: true, adjustY: true } }}
        content={
          <SearchOptions
            options={options}
            selected={selected}
            prefix={completion.prefix}
            id={id}
            accept={accept}
            suggestions={suggestions}
            recentQueries={recentQueries}
            restoreRecentQuery={entry => {
              restoreRecentQuery?.(entry);
              completion.close();
            }}
            t={t}
          />
        }
      >
        <div className={styles.input}>
          <span className={styles.searchPrefix} aria-hidden="true">
            <SearchOutlined />
          </span>
          <div ref={host} className={styles.editor} data-log-search-editor="codemirror" />
          {recent && (
            <span className={styles.recent} onMouseDownCapture={completion.close}>
              {recent}
            </span>
          )}
        </div>
      </Popover>
      {!isStructuredLogSyntax(syntax) && (
        <span className={styles.legacyMode}>
          {t(syntax ? 'explore.logAuthoring.unsupportedMode' : 'explore.logAuthoring.literal')}
        </span>
      )}
      <SearchHelp t={t} syntax={syntax} />
    </div>
  );
}

function SearchHelp({ t, syntax }: Pick<Props, 't' | 'syntax'>) {
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <div
          className={styles.syntaxHelp}
          data-log-command-skip-submit
          role="region"
          aria-label={t('explore.logAuthoring.help')}
          tabIndex={0}
        >
          {!isStructuredLogSyntax(syntax) && <p>{t('explore.logAuthoring.literalHelp')}</p>}
          {isStructuredLogSyntax(syntax) && (
            <>
              <p>{t('explore.logAuthoring.messageHelp')}</p>
              <p>{t('explore.logAuthoring.fullTextHelp')}</p>
            </>
          )}
          <p>{t('explore.logAuthoring.structuredHelp')}</p>
          <code>{t('explore.logAuthoring.example')}</code>
          <details className={styles.advancedHelp}>
            <summary>{t('explore.logAuthoring.advancedHelp')}</summary>
            <p>{t('explore.logAuthoring.collectionHelp')}</p>
            <p>{t('explore.logAuthoring.collectionBounds')}</p>
            {['collectionExample', 'collectionRangeExample', 'collectionGroupExample'].map(key => (
              <p key={key}>
                <code>{t(`explore.logAuthoring.${key}`)}</code>
              </p>
            ))}
            <p>{t('explore.logAuthoring.collectionTextHelp')}</p>
            <p>
              <code>{t('explore.logAuthoring.collectionTextExample')}</code>
            </p>
            <p>
              <code>{t('explore.logAuthoring.collectionEmptyExample')}</code>
            </p>
            <p>{t('explore.logAuthoring.collectionNestedHelp')}</p>
            <p>
              <code>{t('explore.logAuthoring.collectionNestedExample')}</code>
            </p>
            <p>{t('explore.logAuthoring.collectionNestedBounds')}</p>
          </details>
        </div>
      }
    >
      <Button type="text" aria-label={t('explore.logAuthoring.help')} icon={<QuestionCircleOutlined />} />
    </Popover>
  );
}
