/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type {
  AlertGroupDetailState,
  AlertGroupFailure,
  AlertGroupListState
} from '../alert-group-state';
import { useAlertGroupCommandController } from './use-alert-group-command-controller';
import { useAlertGroupQueryController } from './use-alert-group-query-controller';
import { useAlertGroupReadController } from './use-alert-group-read-controller';

export type { AlertGroupDetailState, AlertGroupFailure, AlertGroupListState };

export function useAlertGroupController() {
  const queryController = useAlertGroupQueryController();
  const readController = useAlertGroupReadController(queryController.state.query);
  const commandController = useAlertGroupCommandController(readController.rereadList);

  return {
    state: {
      ...commandController.state,
      ...queryController.state,
      ...readController.state
    },
    ...queryController.actions,
    refresh: readController.refresh,
    ...commandController.actions
  };
}
