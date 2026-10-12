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

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Popover, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { ExploreSavedQueryDrawer } from './explore-saved-query-drawer';
import { ExploreSavedQueryEditor } from './explore-saved-query-editor';
import styles from './explore-saved-queries.module.css';
import { ExploreViewTrigger } from './explore-view-trigger';
import { savedViewTriggerLabel } from './saved-view-trigger-label';

export function ExploreSavedQueryActions({
  model,
  children,
  compact = false
}: {
  model: SavedQueriesViewModel;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={[styles.actions, compact && styles.compactActions].filter(Boolean).join(' ')}>
      {compact ? (
        <CompactQueryActions model={model}>{children}</CompactQueryActions>
      ) : (
        <>
          <SavedQueryControls model={model}>{children}</SavedQueryControls>
          <SavedQueryStatus model={model} />
        </>
      )}
      <ExploreSavedQueryDrawer model={model} />
      <ExploreSavedQueryEditor model={model} />
    </div>
  );
}

function CompactQueryActions({ model, children }: { model: SavedQueriesViewModel; children?: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);
  const label = savedViewTriggerLabel(model, t);
  let warning: string | undefined;
  if (model.activeUnavailable && !model.activeLoading) warning = t('exploreSaved.activeUnavailable');
  else if (!model.sourcePending && !model.dirty && model.saveBlocked) warning = t('exploreSaved.invalidQuery');
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      content={
        <div
          ref={menuRef}
          className={styles.queryActionsMenu}
          role="dialog"
          aria-label={t('exploreSaved.queryActions')}
          tabIndex={-1}
          onKeyDown={event => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setOpen(false);
            triggerRef.current?.focus();
          }}
        >
          <SavedQueryStatus model={model} />
          <SavedQueryControls model={model} compact onAction={() => setOpen(false)} />
          <div className={styles.secondaryActions}>{children}</div>
        </div>
      }
    >
      <ExploreViewTrigger
        ref={triggerRef}
        title={warning}
        aria-label={warning && warning !== label ? `${label}: ${warning}` : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        {label}
      </ExploreViewTrigger>
    </Popover>
  );
}

function SavedQueryControls({
  model,
  children,
  compact = false,
  onAction
}: {
  model: SavedQueriesViewModel;
  children?: ReactNode;
  compact?: boolean;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Space
      direction={compact ? 'vertical' : 'horizontal'}
      wrap={!compact}
      size="small"
      className={compact ? (styles.menuControls ?? '') : ''}
    >
      <Button
        onClick={() => {
          onAction?.();
          model.setOpen(true);
        }}
      >
        {t('exploreSaved.directory')}
      </Button>
      {model.canWrite && (
        <Button
          disabled={model.saveBlocked || model.busy}
          onClick={() => {
            onAction?.();
            model.begin(model.active ? 'update' : 'create');
          }}
        >
          {t(model.active ? 'exploreSaved.update' : 'exploreSaved.save')}
        </Button>
      )}
      {model.canWrite && model.active && (
        <Button
          disabled={model.saveBlocked || model.busy}
          onClick={() => {
            onAction?.();
            model.begin('copy');
          }}
        >
          {t('exploreSaved.saveAs')}
        </Button>
      )}
      {children}
    </Space>
  );
}

function SavedQueryStatus({ model }: { model: SavedQueriesViewModel }) {
  const { t } = useTranslation();
  return (
    <>
      {model.active && (
        <Typography.Text type="secondary">{t('exploreSaved.active', { name: model.active.label })}</Typography.Text>
      )}
      {model.dirty && (
        <Typography.Text type="secondary" role="status">
          {t('exploreSaved.applyFirst')}
        </Typography.Text>
      )}
      {model.activeLoading && (
        <Typography.Text type="secondary" role="status">
          {t('exploreSaved.states.loading')}
        </Typography.Text>
      )}
      {model.activeUnavailable && !model.activeLoading && (
        <Typography.Text type="warning" role="status">
          {t('exploreSaved.activeUnavailable')}
        </Typography.Text>
      )}
      {!model.sourcePending && !model.dirty && !model.activeUnavailable && model.saveBlocked && (
        <Typography.Text type="warning" role="status">
          {t('exploreSaved.invalidQuery')}
        </Typography.Text>
      )}
    </>
  );
}
