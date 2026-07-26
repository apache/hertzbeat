/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useAlertGroupCommandController } from './use-alert-group-command-controller';
import { useAlertGroupPageCorrection } from './use-alert-group-page-correction';
import { useAlertGroupQueryController } from './use-alert-group-query-controller';
import { useAlertGroupReadController } from './use-alert-group-read-controller';
import { useAlertGroupSelection } from './use-alert-group-selection';
import { useAlertLabelSuggestionController } from './use-alert-label-suggestion-controller';

export function useAlertGroupController() {
  const queryController = useAlertGroupQueryController();
  const readController = useAlertGroupReadController(queryController.state.query);
  const commandController = useAlertGroupCommandController(readController.rereadList);
  const labelSuggestions = useAlertLabelSuggestionController();
  const selection = useAlertGroupSelection(queryController.state.query, readController.state.list);
  useAlertGroupPageCorrection(queryController.state.query, readController.state.list, queryController.replacePageIndex);

  return {
    state: {
      ...commandController.state,
      ...queryController.state,
      ...readController.state,
      labelSuggestions,
      selectedIds: selection.selectedIds
    },
    ...queryController.actions,
    refresh: readController.refresh,
    selectIds: selection.selectIds,
    ...commandController.actions
  };
}
