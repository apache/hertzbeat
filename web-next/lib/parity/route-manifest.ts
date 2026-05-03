import manifestData from './route-manifest.json';

export type ParityAuthState = 'public' | 'session';
export type ParityScreenshotMode = 'fullPage' | 'viewport';
export type ParityReferenceCaptureStrategy = 'stable-list-state';

export type ParityRouteParitySpecRecord = {
  key: string;
  archetype: 'dashboard-home' | 'explorer-workbench' | 'list-detail' | 'settings-admin';
  fixtureState: string;
  viewports: Array<{
    key: 'desktop' | 'mobile';
    width: number;
    height: number;
  }>;
  mustMatchRegions: Array<{
    key:
      | 'header'
      | 'factsStrip'
      | 'toolbarQueryRow'
      | 'stageSection'
      | 'rail'
      | 'summaryMetrics'
      | 'tableListRow'
      | 'drawerDetailPanel';
    expectation: 'present' | 'conditional' | 'absent';
    referenceHint: string;
  }>;
  allowedDrift: {
    hierarchy: 'none';
    chrome: 'token-only';
    responsiveWrap: 'allowed';
    copy: 'fixture-only';
  };
};

export type ParityPostLoadActionRecord = {
  kind: 'click';
  selector: string;
  noWaitAfter?: boolean;
  waitAfterMs?: number;
};

export type ParityRoutePairRecord = {
  key: string;
  parityOwner?: string;
  nextRoute: string;
  referenceRoute: string;
  locale?: string;
  screenshotMode?: ParityScreenshotMode;
  nextScreenshotMode?: ParityScreenshotMode;
  referenceScreenshotMode?: ParityScreenshotMode;
  referenceCaptureStrategy?: ParityReferenceCaptureStrategy;
  referenceRouteMode?: 'drop-trace-selection';
  nextPostLoadActions?: ParityPostLoadActionRecord[];
  referencePostLoadActions?: ParityPostLoadActionRecord[];
  nextPagePath?: string;
  routeTestPath?: string;
  routeParitySpec?: ParityRouteParitySpecRecord;
  authState: ParityAuthState;
  seedState: string;
  primarySelectors: string[];
  nextReadySelectors?: string[];
  nextApiStubKey?: string;
  referenceApiStubKey?: string;
  referenceReadySelectors?: string[];
  textSnippets: string[];
  actionLabels: string[];
  minimumVerificationCommand: string;
};

export type ParityRouteFamily = {
  key: string;
  milestone: 1 | 2 | 3 | 4 | 5;
  legacyArea: string;
  summary: string;
  parityOwner?: string;
  familyVerificationCommand?: string;
  referenceBaseUrl: string;
  nextBaseUrl: string;
  routePairs: ParityRoutePairRecord[];
};

export type ResolvedParityRoutePair = ParityRoutePairRecord & {
  familyKey: string;
  milestone: ParityRouteFamily['milestone'];
  referenceBaseUrl: string;
  nextBaseUrl: string;
};

export const PARITY_ROUTE_MANIFEST = manifestData as ParityRouteFamily[];

function findFamilyOrThrow(familyKey: string) {
  const family = PARITY_ROUTE_MANIFEST.find(candidate => candidate.key === familyKey);
  if (!family) {
    throw new Error(`Unknown parity family: ${familyKey}`);
  }
  return family;
}

export function getParityFamiliesForMilestone(milestone: ParityRouteFamily['milestone']) {
  return PARITY_ROUTE_MANIFEST.filter(family => family.milestone === milestone);
}

export function getParityFamily(familyKey: string) {
  return findFamilyOrThrow(familyKey);
}

export function getDefaultParityRoutePairForMilestone(milestone: ParityRouteFamily['milestone']) {
  const family = getParityFamiliesForMilestone(milestone)[0];

  if (!family) {
    throw new Error(`No parity family found for milestone ${milestone}`);
  }

  const routePair = family.routePairs[0];

  if (!routePair) {
    throw new Error(`Parity family ${family.key} has no route pairs`);
  }

  return {
    ...routePair,
    familyKey: family.key,
    milestone: family.milestone,
    referenceBaseUrl: family.referenceBaseUrl,
    nextBaseUrl: family.nextBaseUrl
  };
}

export function getParityRoutePair(familyKey: string, routePairKey: string): ResolvedParityRoutePair {
  const family = findFamilyOrThrow(familyKey);
  const routePair = family.routePairs.find(candidate => candidate.key === routePairKey);

  if (!routePair) {
    throw new Error(`Unknown parity route pair: ${familyKey}/${routePairKey}`);
  }

  return {
    ...routePair,
    familyKey: family.key,
    milestone: family.milestone,
    referenceBaseUrl: family.referenceBaseUrl,
    nextBaseUrl: family.nextBaseUrl
  };
}

export function buildParityReferenceUrl(routePair: Pick<ResolvedParityRoutePair, 'referenceBaseUrl' | 'referenceRoute'>) {
  return new URL(routePair.referenceRoute, routePair.referenceBaseUrl).toString();
}

export function buildParityNextUrls(routePair: Pick<ResolvedParityRoutePair, 'nextBaseUrl' | 'nextRoute'>) {
  return [new URL(routePair.nextRoute, routePair.nextBaseUrl).toString()];
}
