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

import { useAlertInhibitActionCapabilities } from './use-alert-inhibit-action-capabilities';
import { useAlertInhibitCommandController } from './use-alert-inhibit-command-controller';
import { useAlertInhibitReadController } from './use-alert-inhibit-read-controller';
import { useAlertInhibitSelection } from './use-alert-inhibit-selection';
import { useAlertLabelSuggestionController } from './use-alert-label-suggestion-controller';

export function useAlertInhibitController() {
  const capabilities = useAlertInhibitActionCapabilities();
  const read = useAlertInhibitReadController();
  const command = useAlertInhibitCommandController(
    read.rereadAuthoritatively,
    read.state.management.context,
    capabilities
  );
  const labelSuggestions = useAlertLabelSuggestionController();
  const selection = useAlertInhibitSelection(read.state.query, read.state.list);
  const selectIds = selection.selectIds;
  useEffect(() => {
    if (!capabilities.canDelete) selectIds([]);
  }, [capabilities.canDelete, selectIds]);
  const unlessLocked =
    <Args extends unknown[]>(action: (...args: Args) => unknown) =>
    (...args: Args) => {
      if (!command.controls.isLocked()) return action(...args);
    };
  return {
    capabilities,
    state: {
      ...command.state,
      ...read.state,
      labelSuggestions,
      selectedIds: capabilities.canDelete ? selection.selectedIds : []
    },
    setSearch: unlessLocked(read.actions.setSearch),
    submitSearch: unlessLocked(read.actions.submitSearch),
    changePage: unlessLocked(read.actions.changePage),
    refresh: unlessLocked(read.actions.refresh),
    viewAllRules: unlessLocked(read.actions.viewAllRules),
    viewMatchedRules: unlessLocked(read.actions.viewMatchedRules),
    returnToEntity: unlessLocked(read.actions.returnToEntity),
    selectIds: unlessLocked((ids: number[]) => {
      if (capabilities.canDelete) selectIds(ids);
    }),
    ...command.actions
  };
}
