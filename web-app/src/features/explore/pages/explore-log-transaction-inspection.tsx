/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
