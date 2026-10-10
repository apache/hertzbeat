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
  const { selectedIds, selectIds } = selection;
  useAlertGroupPageCorrection(queryController.state.query, readController.state.list, queryController.replacePageIndex);
  useEffect(() => {
    if (!capabilities.canDelete) selectIds([]);
  }, [capabilities.canDelete, selectIds]);

  return {
    capabilities,
    state: {
      ...commandController.state,
      ...queryController.state,
      ...readController.state,
      labelSuggestions,
      selectedIds: capabilities.canDelete ? selectedIds : []
    },
    ...queryController.actions,
    refresh: readController.refresh,
    selectIds: (ids: number[]) => {
      if (capabilities.canDelete) selectIds(ids);
    },
    ...commandController.actions
  };
}
