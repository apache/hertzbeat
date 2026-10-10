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
import { SIGNALS, type SourceEntry } from '../model/instrumentation-v2-contract';
import { translateBackend } from './instrumentation-i18n';
import { InstrumentationSourceIcon } from './instrumentation-source-icon';
import styles from './instrumentation-shell.module.css';

export function InstrumentationSourceTile(props: {
  source: SourceEntry;
  selected: boolean;
  onSelect: (sourceId: string) => void;
}) {
  const { t } = useTranslation();
  const source = props.source;
  const sourceName = translateBackend(t, source.labelKey);
  const sourceDescription = translateBackend(t, source.descriptionKey);
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      className={`${styles.sourceTile} ${props.selected ? styles.sourceTileSelected : ''}`}
      disabled={source.support === 'unsupported'}
      title={sourceName}
      onClick={() => props.onSelect(source.id)}
    >
      <InstrumentationSourceIcon source={source} />
      <span className={styles.sourceName}>{sourceName}</span>
      {source.support !== 'supported' && (
        <span className={styles.sourceStatus} data-support={source.support}>
          {t(`instrumentation.capability.${source.support}`)}
        </span>
      )}
      <span className={styles.sourceAssistiveText}>
        {sourceDescription}
        {SIGNALS.map(signal => (
          <span key={signal}>
            {t(`instrumentation.signal.${signal}`)} {t(`instrumentation.capability.${source.signals[signal]}`)}
          </span>
        ))}
      </span>
    </button>
  );
}
