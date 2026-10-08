/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
export type FacetRead<T> = {
  state:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'error'
    | 'permission'
    | 'unavailable'
    | 'calculated_budget_exceeded'
    | 'calculated_invalid_pattern';
  data?: T | undefined;
};
export function FacetReadState({
  state,
  unavailable,
  onRetry
}: {
  state: FacetRead<unknown>['state'];
  unavailable: boolean | undefined;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (state === 'ready' && !unavailable) return null;
  if (state === 'calculated_budget_exceeded' || state === 'calculated_invalid_pattern')
    return (
      <div role="alert">
        <p>
          {t(
            state === 'calculated_budget_exceeded'
              ? 'explore.logCalculatedV2.queryBudgetExceeded'
              : 'explore.logCalculatedV2.queryInvalidPattern'
          )}
        </p>
      </div>
    );
  const key = unavailable ? 'unavailable' : state;
  return (
    <div role={state === 'error' ? 'alert' : 'status'}>
      <p>{t(`explore.logFacets.states.${key}`)}</p>
      {state === 'error' && <Button onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  );
}
