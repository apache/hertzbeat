/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useAlertInhibitCommandController } from './use-alert-inhibit-command-controller';
import { useAlertInhibitReadController } from './use-alert-inhibit-read-controller';
import { useAlertInhibitSelection } from './use-alert-inhibit-selection';

export function useAlertInhibitController() {
  const read = useAlertInhibitReadController();
  const command = useAlertInhibitCommandController(read.rereadAuthoritatively);
  const selection = useAlertInhibitSelection(read.state.query, read.state.list);
  const unlessLocked =
    <Args extends unknown[]>(action: (...args: Args) => unknown) =>
    (...args: Args) => {
      if (!command.controls.isLocked()) return action(...args);
    };
  return {
    state: { ...command.state, ...read.state, selectedIds: selection.selectedIds },
    setSearch: unlessLocked(read.actions.setSearch),
    submitSearch: unlessLocked(read.actions.submitSearch),
    changePage: unlessLocked(read.actions.changePage),
    refresh: unlessLocked(read.actions.refresh),
    viewAllRules: unlessLocked(read.actions.viewAllRules),
    viewMatchedRules: unlessLocked(read.actions.viewMatchedRules),
    returnToEntity: unlessLocked(read.actions.returnToEntity),
    selectIds: unlessLocked(selection.selectIds),
    ...command.actions
  };
}
