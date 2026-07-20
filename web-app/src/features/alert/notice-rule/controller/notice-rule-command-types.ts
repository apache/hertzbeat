/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { DataProvider } from '@refinedev/core';

import type { NoticeRule } from '../model/notice-rule-model';
import type { NoticeRuleFailureKind } from '../model/notice-rule-failure';
import type { NoticeRuleCommandGate, NoticeRuleEditorController } from './notice-rule-editor-controller';
import type { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';

type WriteFailure = Exclude<NoticeRuleFailureKind, 'missing'>;

export type NoticeRuleCommandNotifications = {
  validation: () => void;
  saveSuccess: () => void;
  deleteSuccess: () => void;
  proofFailure: (failure: 'unavailable' | 'error' | 'commit-uncertain') => void;
  saveFailure: (failure: WriteFailure) => void;
  deleteFailure: (failure: WriteFailure) => void;
};

export type NoticeRuleCommandContext = {
  list: ReturnType<typeof useNoticeRuleList>;
  options: ReturnType<typeof useNoticeRuleOptions>;
  provider: DataProvider;
  gate: NoticeRuleCommandGate;
  editor: NoticeRuleEditorController;
  loadDetail: (id: number) => Promise<NoticeRule>;
  notify: NoticeRuleCommandNotifications;
};
