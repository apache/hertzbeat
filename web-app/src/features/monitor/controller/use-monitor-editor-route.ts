/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams, type NavigateFunction } from 'react-router-dom';

import {
  normalizeMonitorScrape,
  type MonitorApp,
  type MonitorDetail,
  type MonitorEditorMode
} from '../model/monitor-contract';
import { parseMonitorRouteId } from '../model/monitor-detail-model';
import { isSelectableMonitorApp, safeMonitorReturnTo } from '../model/monitor-model';

export function useMonitorEditorRoute(mode: MonitorEditorMode) {
  const navigate = useNavigate();
  const location = useLocation();
  const { monitorId } = useParams();
  const [searchParams] = useSearchParams();
  const id = parseMonitorRouteId(monitorId);
  const rawScrape = searchParams.get('scrape');

  return {
    id,
    mode,
    navigate,
    pathname: location.pathname,
    rawScrape,
    requestedApp: mode === 'new' ? (searchParams.get('app')?.trim() ?? '') : '',
    requestedScrape: normalizeMonitorScrape(rawScrape),
    returnTo: safeMonitorReturnTo(searchParams.get('returnTo')),
    searchParams,
    validRoute: mode === 'new' || id !== undefined
  };
}

type CanonicalUrlInput = {
  validRoute: boolean;
  apps: MonitorApp[] | undefined;
  mode: MonitorEditorMode;
  requestedApp: string;
  rawScrape: string | null;
  detail: MonitorDetail | undefined;
  carrySource: string | undefined;
  source: string;
  searchParams: URLSearchParams;
  pathname: string;
  navigate: NavigateFunction;
};

export function useCanonicalMonitorEditorUrl(input: CanonicalUrlInput) {
  useEffect(() => {
    const target = canonicalEditorSearch(input);
    if (target !== undefined) {
      void input.navigate(`${input.pathname}?${target}`, { replace: true });
    }
  }, [input]);
}

function canonicalEditorSearch(input: CanonicalUrlInput) {
  if (!input.validRoute || !input.apps) return undefined;
  const corrections = monitorEditorUrlCorrections(input);
  if (!Object.values(corrections).some(Boolean)) return undefined;

  const params = new URLSearchParams(input.searchParams);
  if (corrections.invalidApp) params.delete('app');
  if (corrections.invalidScrape) {
    params.set('scrape', input.mode === 'edit' ? normalizeMonitorScrape(input.detail?.monitor.scrape) : 'static');
  }
  // A direct edit URL cannot silently change the persisted scrape source.
  // Only an explicit in-page transition carries draft values across sources.
  if (corrections.directEditDrift) {
    params.set('scrape', normalizeMonitorScrape(input.detail?.monitor.scrape));
  }
  return params.toString();
}

function monitorEditorUrlCorrections(input: CanonicalUrlInput) {
  return {
    invalidApp: isInvalidRequestedApp(input),
    invalidScrape: isInvalidRequestedScrape(input),
    directEditDrift: isDirectEditDrift(input)
  };
}

function isInvalidRequestedApp(input: CanonicalUrlInput) {
  return (
    input.mode === 'new' &&
    Boolean(input.requestedApp) &&
    !input.apps?.some(app => app.value === input.requestedApp && isSelectableMonitorApp(app))
  );
}

function isInvalidRequestedScrape(input: CanonicalUrlInput) {
  return input.rawScrape !== null && input.rawScrape !== normalizeMonitorScrape(input.rawScrape);
}

function isDirectEditDrift(input: CanonicalUrlInput) {
  return (
    input.mode === 'edit' &&
    input.detail !== undefined &&
    input.rawScrape !== null &&
    normalizeMonitorScrape(input.rawScrape) !== normalizeMonitorScrape(input.detail.monitor.scrape) &&
    input.carrySource !== input.source
  );
}
