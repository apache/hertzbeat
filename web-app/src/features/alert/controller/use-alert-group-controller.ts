/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect } from 'react';

import { useAlertGroupCommandController } from './use-alert-group-command-controller';
import { useAlertGroupActionCapabilities } from './use-alert-group-action-capabilities';
import { useAlertGroupPageCorrection } from './use-alert-group-page-correction';
import { useAlertGroupQueryController } from './use-alert-group-query-controller';
import { useAlertGroupReadController } from './use-alert-group-read-controller';
import { useAlertGroupSelection } from './use-alert-group-selection';
import { useAlertLabelSuggestionController } from './use-alert-label-suggestion-controller';

export function useAlertGroupController() {
  const capabilities = useAlertGroupActionCapabilities();
  const queryController = useAlertGroupQueryController();
  const readController = useAlertGroupReadController(queryController.state.query);
  const commandController = useAlertGroupCommandController(readController.rereadList, capabilities);
  const labelSuggestions = useAlertLabelSuggestionController();
  const selection = useAlertGroupSelection(queryController.state.query, readController.state.list);
  useAlertGroupPageCorrection(queryController.state.query, readController.state.list, queryController.replacePageIndex);
  useEffect(() => {
    if (!capabilities.canDelete) selection.selectIds([]);
  }, [capabilities.canDelete, selection.selectIds]);

  return {
    capabilities,
    state: {
      ...commandController.state,
      ...queryController.state,
      ...readController.state,
      labelSuggestions,
      selectedIds: capabilities.canDelete ? selection.selectedIds : []
    },
    ...queryController.actions,
    refresh: readController.refresh,
    selectIds: (ids: number[]) => {
      if (capabilities.canDelete) selection.selectIds(ids);
    },
    ...commandController.actions
  };
}
