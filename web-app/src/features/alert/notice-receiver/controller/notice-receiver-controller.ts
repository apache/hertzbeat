/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNoticeReceiverCommandController } from './use-notice-receiver-command-controller';
import { useNoticeReceiverQueryController } from './notice-receiver-query-controller';
import { useNoticeReceiverPageCorrection } from './use-notice-receiver-page-correction';
import { useNoticeReceiverReadController } from './use-notice-receiver-read-controller';

export function useNoticeReceiverController() {
  const query = useNoticeReceiverQueryController();
  const read = useNoticeReceiverReadController(query.query);
  useNoticeReceiverPageCorrection(query.query, read.state.list, query.replacePageIndex);
  const command = useNoticeReceiverCommandController({
    loadExact: read.loadExact,
    rereadAuthoritatively: read.rereadAuthoritatively
  });
  const unlessLocked = (action: () => void) => {
    if (!command.controls.isLocked()) action();
  };
  const refresh = () => {
    if (command.controls.hasReceipt()) return command.actions.retry();
    if (command.controls.isLocked()) return Promise.resolve(false);
    return read.refresh();
  };
  return {
    state: { query: query.query, name: query.name, ...read.state, ...command.state },
    actions: {
      setName: (value: string) => unlessLocked(() => query.setName(value)),
      search: () => unlessLocked(query.search),
      changePage: (page: number, pageSize: number) => unlessLocked(() => query.changePage(page, pageSize)),
      refresh,
      ...command.actions
    }
  };
}
