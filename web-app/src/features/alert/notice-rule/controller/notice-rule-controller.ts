/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useNoticeRuleCommandController } from './notice-rule-command-controller';
import { useNoticeRuleQueryController } from './notice-rule-query-controller';
import { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';

export function useNoticeRuleController() {
  const queryController = useNoticeRuleQueryController();
  const options = useNoticeRuleOptions();
  const list = useNoticeRuleList(queryController.query);
  const commandController = useNoticeRuleCommandController(list, options);
  const { gate, editor } = commandController;

  return {
    state: {
      command: gate.command,
      draft: editor.draft,
      list: list.state,
      name: queryController.name,
      options: { kind: options.kind },
      recovery: gate.recovery,
      query: queryController.query,
      receivers: options.receivers,
      refreshing: list.refreshing,
      saving: gate.command === 'saving',
      templates: options.templates,
      togglingRuleId: gate.togglingRuleId
    },
    actions: {
      changePage: queryController.changePage,
      ...editor.actions,
      refresh: list.refresh,
      ...commandController.actions,
      search: queryController.search,
      setName: queryController.setName
    }
  };
}
