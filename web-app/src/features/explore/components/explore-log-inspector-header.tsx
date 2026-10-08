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

import {
  CloseOutlined,
  CopyOutlined,
  ExportOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useId } from 'react';
import type { traceActionReason } from './log-trace-action';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './explore-log-inspector.module.css';

type Props = {
  traceReason?: ReturnType<typeof traceActionReason>;
  selectedIndex: number | undefined;
  rowCount: number;
  pageIndex?: number | undefined;
  totalPages?: number | undefined;
  evidenceCurrent: boolean;
  onSelectIndex: (index: number) => void;
  onInvestigate?: (() => void) | undefined;
  onOpenTrace?: (() => void) | undefined;
  onClose: () => void;
  onCopy: () => void;
};

export function InspectorHeader(props: Props) {
  const { t } = useTranslation();
  const reasonId = useId();
  return (
    <header className={styles.header}>
      <strong>{t('explore.perses.logInspector')}</strong>
      <InspectorNavigation {...props} />
      <InspectorActions {...props} reasonId={reasonId} />
      {props.traceReason && (
        <p id={reasonId} className={styles.traceReason}>
          {t(props.traceReason)}
        </p>
      )}
    </header>
  );
}

function InspectorNavigation({
  selectedIndex,
  rowCount,
  pageIndex = 0,
  totalPages = 1,
  evidenceCurrent,
  onSelectIndex
}: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.navigation}>
      <Button
        type="text"
        size="small"
        icon={<LeftOutlined aria-hidden="true" />}
        aria-label={t('explore.perses.previousLog')}
        disabled={selectedIndex == null || !evidenceCurrent || (selectedIndex <= 0 && pageIndex <= 0)}
        onClick={() => selectedIndex != null && onSelectIndex(selectedIndex - 1)}
      />
      <span
        title={t('explore.perses.selectedLogPosition', {
          current: selectedIndex == null ? '—' : selectedIndex + 1,
          total: rowCount
        })}
        aria-label={t('explore.perses.selectedLogPosition', {
          current: selectedIndex == null ? '—' : selectedIndex + 1,
          total: rowCount
        })}
      >
        {selectedIndex == null ? '—' : selectedIndex + 1} / {rowCount}
      </span>
      <Button
        type="text"
        size="small"
        icon={<RightOutlined aria-hidden="true" />}
        aria-label={t('explore.perses.nextLog')}
        disabled={
          selectedIndex == null || !evidenceCurrent || (selectedIndex >= rowCount - 1 && pageIndex >= totalPages - 1)
        }
        onClick={() => selectedIndex != null && onSelectIndex(selectedIndex + 1)}
      />
    </div>
  );
}

function InspectorActions({
  evidenceCurrent,
  onCopy,
  onInvestigate,
  onOpenTrace,
  onClose,
  traceReason,
  reasonId
}: Props & { reasonId: string }) {
  const { t } = useTranslation();
  return (
    <div className={styles.actions}>
      <Button
        size="small"
        icon={<CopyOutlined aria-hidden="true" />}
        aria-label={t('explore.perses.copyLog')}
        disabled={!evidenceCurrent}
        onClick={onCopy}
      />
      <Button
        size="small"
        icon={<SearchOutlined aria-hidden="true" />}
        disabled={!evidenceCurrent || !onInvestigate}
        onClick={onInvestigate}
      >
        {t('explore.perses.investigateLogAction')}
      </Button>
      <Button
        size="small"
        icon={<ExportOutlined aria-hidden="true" />}
        aria-describedby={traceReason ? reasonId : undefined}
        disabled={!evidenceCurrent || !onOpenTrace}
        onClick={onOpenTrace}
      >
        {t('explore.perses.openTraceAction')}
      </Button>
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined aria-hidden="true" />}
        aria-label={t('explore.perses.closeInspector')}
        onClick={onClose}
      />
    </div>
  );
}
