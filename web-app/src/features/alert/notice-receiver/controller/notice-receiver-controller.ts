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

import { useNoticeActionCapabilities } from '../../controller/use-notice-action-capabilities';
import { useNoticeReceiverCommandController } from './use-notice-receiver-command-controller';
import { useNoticeReceiverQueryController } from './notice-receiver-query-controller';
import { useNoticeReceiverPageCorrection } from './use-notice-receiver-page-correction';
import { useNoticeReceiverReadController } from './use-notice-receiver-read-controller';

export function useNoticeReceiverController() {
  const capabilities = useNoticeActionCapabilities();
  const query = useNoticeReceiverQueryController();
  const read = useNoticeReceiverReadController(query.query);
  useNoticeReceiverPageCorrection(query.query, read.state.list, query.replacePageIndex);
  const command = useNoticeReceiverCommandController(
    {
      loadExact: read.loadExact,
      rereadAuthoritatively: read.rereadAuthoritatively
    },
    capabilities
  );
  const unlessLocked = (action: () => void) => {
    if (!command.controls.isLocked()) action();
  };
  const refresh = () => {
    if (command.controls.hasReceipt()) return command.actions.retry();
    if (command.controls.isLocked()) return Promise.resolve(false);
    return read.refresh();
  };
  return {
    state: { capabilities, query: query.query, name: query.name, ...read.state, ...command.state },
    actions: {
      setName: (value: string) => unlessLocked(() => query.setName(value)),
      search: () => unlessLocked(query.search),
      changePage: (page: number, pageSize: number) => unlessLocked(() => query.changePage(page, pageSize)),
      refresh,
      ...command.actions
    }
  };
}
