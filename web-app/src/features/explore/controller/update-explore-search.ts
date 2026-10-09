/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { Location, NavigateFunction, SetURLSearchParams } from 'react-router-dom';
import type { ExploreQuery } from '../model/explore-model';

export function updateExploreSearch(
  path: string,
  signal: ExploreQuery['signal'],
  location: Location,
  navigate: NavigateFunction,
  setSearchParams: SetURLSearchParams
) {
  const marker = path.indexOf('?');
  const nextSearch = new URLSearchParams(marker < 0 ? '' : path.slice(marker + 1));
  if (signal === 'logs' && location.hash === '#saved-queries') {
    void navigate({ pathname: location.pathname, search: `?${nextSearch.toString()}`, hash: location.hash });
  } else {
    setSearchParams(nextSearch);
  }
}
