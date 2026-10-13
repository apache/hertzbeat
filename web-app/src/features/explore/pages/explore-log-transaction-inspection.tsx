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

import { useState } from 'react';
import { useLogTransactionDetail } from '../controller/use-log-transaction-detail';
import { ExploreLogTransactionRail, type LogTransactionRailProps } from '../components/explore-log-transaction-rail';
type Props = Pick<LogTransactionRailProps, 'query' | 'window' | 'config' | 'item' | 'onClose' | 't'>;
export function ExploreLogTransactionInspection(props: Props) {
  const [draft, setDraft] = useState('');
  const [detail, setDetail] = useState({
    identity: props.item.identity,
    search: '',
    pageIndex: 0,
    sort: 'oldest' as 'oldest' | 'newest'
  });
  const load = useLogTransactionDetail(props.query, props.window, props.config, detail, true);
  return (
    <ExploreLogTransactionRail
      {...props}
      load={load}
      draft={draft}
      setDraft={setDraft}
      detail={detail}
      apply={search => setDetail(value => ({ ...value, search, pageIndex: 0 }))}
      onSort={sort => setDetail(value => ({ ...value, sort, pageIndex: 0 }))}
      onPage={pageIndex => setDetail(value => ({ ...value, pageIndex }))}
    />
  );
}
