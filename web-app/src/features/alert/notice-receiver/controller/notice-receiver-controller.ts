/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNoticeReceiverCommandController } from './use-notice-receiver-command-controller';
import { useNoticeReceiverQueryController } from './notice-receiver-query-controller';
import { useNoticeReceiverReadController } from './use-notice-receiver-read-controller';

export type { NoticeReceiverListState } from './use-notice-receiver-read-controller';

export function useNoticeReceiverController() {
  const query = useNoticeReceiverQueryController();
  const read = useNoticeReceiverReadController(query.query);
  const command = useNoticeReceiverCommandController({
    loadExact: read.loadExact,
    rereadAuthoritatively: read.rereadAuthoritatively
  });
  return {
    state: { query: query.query, name: query.name, ...read.state, ...command.state },
    actions: {
      setName: query.setName,
      search: query.search,
      changePage: query.changePage,
      refresh: read.refresh,
      ...command.actions
    }
  };
}
