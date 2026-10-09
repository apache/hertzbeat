/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { ExploreLogTransactionInspection } from './explore-log-transaction-inspection';
import { useRef, useState, type ReactNode } from 'react';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogTransactionsView } from '../model/explore-log-transactions-view';
import type { TFunction } from 'i18next';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { ExploreLogTransactions } from '../components/explore-log-transactions';
import { ExploreLogPatternWorkspace } from './explore-log-pattern-workspace';
import { ExploreLogCalculatedWorkspace } from './explore-log-calculated-workspace';
export function ExploreLogTransactionWorkspace({
  controller,
  t,
  children
}: {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  children: ReactNode;
}) {
  if (controller.query.signal !== 'logs') return children;
  return (
    <AppliedLogGrouping controller={controller} t={t}>
      {children}
    </AppliedLogGrouping>
  );
}

function AppliedLogGrouping({
  controller,
  t,
  children
}: {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  children: ReactNode;
}) {
  const { query, result, transactions } = controller;
  if (query.signal !== 'logs') return children;
  if (transactions?.active) return <TransactionResults load={transactions} query={query} t={t} />;
  if (
    !['patterns', 'calculated'].includes(query.logAggregation ?? '') ||
    !['ready', 'empty'].includes(result.kind) ||
    !('signal' in result)
  )
    return children;
  if (result.signal !== 'logs') return children;
  if (query.logAggregation === 'calculated')
    return <ExploreLogCalculatedWorkspace query={query} window={result.window} revision={result.revision} t={t} />;
  return <ExploreLogPatternWorkspace query={query} window={result.window} revision={result.revision} t={t} />;
}

function TransactionResults({ load, query, t }: { load: LogTransactionsView; query: LogExploreQuery; t: TFunction }) {
  const [selection, setSelection] = useState<{ owner: string; identity: string }>();
  const buttons = useRef(new Map<string, HTMLElement>());
  const item =
    selection?.owner === load.owner ? load.data?.items.find(row => row.identity === selection.identity) : undefined;
  const close = () => {
    const identity = selection?.identity;
    setSelection(undefined);
    requestAnimationFrame(() => {
      if (identity) buttons.current.get(identity)?.focus();
    });
  };
  return (
    <>
      <ExploreLogTransactions
        load={load}
        t={t}
        selected={item?.identity}
        onSelect={identity => setSelection({ owner: load.owner, identity })}
        buttons={buttons}
      />
      {item && load.config && load.window && (
        <ExploreLogTransactionInspection
          key={JSON.stringify([load.owner, item.identity])}
          query={query}
          window={load.window}
          config={load.config}
          item={item}
          onClose={close}
          t={t}
        />
      )}
    </>
  );
}
