/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  classifyAlertGroupReadError,
  deleteAlertGroup,
  loadAlertGroup,
  saveAlertGroup,
  updateAlertGroupEnabled
} from '../alert-group-api';
import {
  AlertGroupContractError,
  alertGroupDraftFromDetail,
  buildAlertGroupPayload,
  buildAlertGroupTogglePayload,
  createAlertGroupDraft,
  validateAlertGroupDraft,
  type AlertGroupConverge,
  type AlertGroupDraft,
  type AlertGroupPage
} from '../alert-group-model';
import type { AlertGroupDetailState, AlertGroupFailure } from '../alert-group-state';
import {
  proveAlertGroupMissing,
  requireAlertGroupConvergence,
  requireExactAlertGroupId
} from '../alert-group-write-proof';

export function useAlertGroupCommandController(rereadList: () => Promise<AlertGroupPage>) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<AlertGroupDraft | null>(null);
  const [detail, setDetail] = useState<AlertGroupDetailState>({ kind: 'idle' });
  const [editorFailure, setEditorFailure] = useState<AlertGroupFailure>();
  const [command, setCommand] = useState<'idle' | 'saving' | 'operating'>('idle');

  const edit = async (id: number) => {
    setDetail({ kind: 'loading', id });
    try {
      const record = await loadAlertGroup(id);
      requireExactAlertGroupId(record.id, id);
      setDraft(alertGroupDraftFromDetail(record));
      setEditorFailure(undefined);
      setDetail({ kind: 'idle' });
    } catch (reason) {
      setDetail({ kind: classifyAlertGroupReadError(reason), id });
    }
  };
  const submit = async () => {
    if (!draft || validateAlertGroupDraft(draft).length > 0) {
      void message.warning(t('alertGroups.validation'));
      return;
    }
    setCommand('saving');
    setEditorFailure(undefined);
    try {
      await saveAlertGroup(draft);
      if (draft.id !== undefined) {
        const canonical = await loadAlertGroup(draft.id);
        requireAlertGroupConvergence(canonical, { ...buildAlertGroupPayload(draft), id: draft.id });
      }
      await rereadList();
      setDraft(null);
      setDetail({ kind: 'idle' });
      void message.success(t('alertGroups.saveSuccess'));
    } catch (reason) {
      setEditorFailure(classifyAlertGroupReadError(reason));
      void message.error(t('alertGroups.saveFailed'));
    } finally {
      setCommand('idle');
    }
  };
  const toggle = async (group: AlertGroupConverge, enable: boolean) => {
    setCommand('operating');
    try {
      await updateAlertGroupEnabled(group, enable);
      const canonical = await loadAlertGroup(group.id);
      requireAlertGroupConvergence(canonical, buildAlertGroupTogglePayload(group, enable));
      await rereadList();
      void message.success(t('alertGroups.operationSuccess'));
    } catch {
      void message.error(t('alertGroups.operationFailed'));
    } finally {
      setCommand('idle');
    }
  };
  const remove = async (id: number) => {
    setCommand('operating');
    try {
      await deleteAlertGroup(id);
      await proveAlertGroupMissing(id);
      const canonical = await rereadList();
      if (canonical.content.some(record => record.id === id)) {
        throw new AlertGroupContractError('deleted id remains');
      }
      void message.success(t('alertGroups.operationSuccess'));
    } catch {
      void message.error(t('alertGroups.operationFailed'));
    } finally {
      setCommand('idle');
    }
  };

  return {
    state: { command, detail, draft, editorFailure },
    actions: {
      create: () => {
        setDraft(createAlertGroupDraft());
        setDetail({ kind: 'idle' });
        setEditorFailure(undefined);
      },
      edit,
      retryDetail: () => detail.kind === 'idle' ? Promise.resolve() : edit(detail.id),
      closeDraft: () => { if (command === 'idle') setDraft(null); },
      updateDraft: (patch: Partial<AlertGroupDraft>) => {
        setDraft(current => current ? { ...current, ...patch } : current);
      },
      submit,
      toggle,
      remove
    }
  };
}
