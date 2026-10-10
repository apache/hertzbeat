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
import { useLiveLogController } from '../controller/use-live-log-controller';
import { availableLogColumns } from '../model/explore-log-columns';
import { useLogView } from '../controller/use-log-view';
import { buildExplorePath, mergeExploreQuery, type LogExploreQuery } from '../model/explore-model';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import { LogStreamResult } from '../components/log-stream-result';
import { ExploreLogResultOptions } from '../components/explore-log-result-options';
import styles from '../components/explore-live-log.module.css';
import { LogViewNotice } from '../components/explore-log-view-notice';
export function LiveLogPanel(
  props: LogInspectorFilterControls & { query: LogExploreQuery; openPath: (path: string) => void }
) {
  const { t } = useTranslation();
  const { query, openPath } = props;
  const copyLabels = {
    copyOptions: t('explore.logCopy.copyOptions'),
    copied: t('explore.logCopy.copied'),
    menu: t('explore.logCopy.menu'),
    copyTimestamp: t('explore.logCopy.copyTimestamp'),
    copyTimestampDescription: t('explore.logCopy.copyTimestampDescription'),
    copyMessage: t('explore.logCopy.copyMessage'),
    copyMessageDescription: t('explore.logCopy.copyMessageDescription'),
    copyJson: t('explore.logCopy.copyJson'),
    copyJsonDescription: t('explore.logCopy.copyJsonDescription')
  };
  const live = useLiveLogController(query);
  const display = useLogView(query, logView => openPath(buildExplorePath(mergeExploreQuery(query, { logView }))));
  return (
    <>
      <LogViewNotice display={display} />
      <div className={styles.controls}>
        <ExploreLogResultOptions
          logColumns={display.logColumns}
          availableColumns={availableLogColumns(live.rows)}
          query={query}
          preferences={display.preferences}
          onPreferencesChange={display.onPreferencesChange}
          t={t}
        />
      </div>
      <LogStreamResult
        {...props}
        query={query}
        t={t}
        navigate={openPath}
        stream={live}
        logDisplay={{
          ...display.preferences,
          copyLabels,
          onShowTimeChange: showTime => display.onPreferencesChange({ ...display.preferences, showTime }),
          onShowContentChange: showContent => display.onPreferencesChange({ ...display.preferences, showContent })
        }}
        logColumns={display.logColumns}
        evidenceIdentity={live.evidenceIdentity}
      />
    </>
  );
}
