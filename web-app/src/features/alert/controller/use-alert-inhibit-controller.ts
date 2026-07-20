/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useAlertInhibitCommandController } from './use-alert-inhibit-command-controller';
import { useAlertInhibitReadController } from './use-alert-inhibit-read-controller';

export type { AlertInhibitDetailState, AlertInhibitFailure } from './use-alert-inhibit-editor-controller';
export type { AlertInhibitListState } from './use-alert-inhibit-read-controller';

export function useAlertInhibitController() {
  const read = useAlertInhibitReadController();
  const command = useAlertInhibitCommandController(read.rereadAuthoritatively);
  const unlessLocked =
    <Args extends unknown[]>(action: (...args: Args) => unknown) =>
    (...args: Args) => {
      if (!command.controls.isLocked()) return action(...args);
    };
  return {
    state: { ...command.state, ...read.state },
    setSearch: unlessLocked(read.actions.setSearch),
    submitSearch: unlessLocked(read.actions.submitSearch),
    changePage: unlessLocked(read.actions.changePage),
    refresh: unlessLocked(read.actions.refresh),
    ...command.actions
  };
}
