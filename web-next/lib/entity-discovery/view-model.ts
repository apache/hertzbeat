import type { EntityCatalogSuggestions, EntityDiscoveryGovernanceActivity, EntityDiscoveryGovernancePreset, Monitor } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type DiscoveryGovernanceActionKind = 'primary' | 'secondary' | 'link';

export type DiscoveryGovernanceState = 'merge' | 'create' | 'enrich' | 'resolved';

export type DiscoveryAttributionState = 'merge' | 'create' | 'review' | 'resolved' | 'preset';

export type DiscoveryStatusTone = 'success' | 'warning' | 'critical' | 'neutral';

export type DiscoveryScope = 'all' | 'matched' | 'resolved' | 'new';

export interface DiscoveryScopeOption {
  key: DiscoveryScope;
  label: string;
  count: number;
}

export interface DiscoveryIntakeQueueGroup {
  key: 'review' | 'merge' | 'create' | 'resolved';
  title: string;
  summary: string;
  actionLabel: string;
  action: 'review' | 'select-merge' | 'select-create' | 'resolved';
  cardKeys: string[];
  sampleTitles: string[];
}

export interface DiscoveryBulkSummary {
  totalCount: number;
  selectedCount: number;
  mergeReadyCount: number;
  createReadyCount: number;
  reviewCount: number;
}

export interface DiscoveryBulkOverrideDrafts {
  ownerDraft?: string | null;
  systemDraft?: string | null;
}

export interface DiscoveryBulkOverrideTag {
  label: string;
  value: string;
}

export interface DiscoverySuggestionChip {
  label: string;
  active: boolean;
}

export interface DiscoveryPresetShortcut {
  label: string;
  owner?: string;
  system?: string;
  active: boolean;
}

export interface DiscoveryBulkSuggestionSet {
  ownerChips: DiscoverySuggestionChip[];
  systemChips: DiscoverySuggestionChip[];
  presetActions: DiscoveryPresetShortcut[];
}

export interface DiscoveryTableRow {
  key: string;
  name: string;
  instance: string;
  status: string;
  statusTone: DiscoveryStatusTone;
  owner: string;
  system: string;
  environment: string;
  activity: string;
  href: string;
  attributionState: DiscoveryAttributionState;
  attributionLabel: string;
  attributionCopy: string;
  primaryActionLabel: string;
}

export interface DiscoveryGovernanceAction {
  label: string;
  href: string;
  kind: DiscoveryGovernanceActionKind;
}

export interface DiscoveryGovernanceCard {
  key: string;
  title: string;
  state: DiscoveryGovernanceState;
  meta: string;
  draftTitle: string;
  draftSubtitle: string;
  completeness: string;
  riskLabel: string;
  nextActionLabel: string;
  recommendation: string;
  candidateLabel?: string;
  candidateContext?: string;
  actions: DiscoveryGovernanceAction[];
}

export function buildDiscoveryFacts(
  presets: EntityDiscoveryGovernancePreset[],
  activities: EntityDiscoveryGovernanceActivity[],
  catalog: EntityCatalogSuggestions,
  t: Translator
) {
  return [
    { label: t('entities.discovery.facts.workspace'), value: 'entities/discovery' },
    { label: t('entities.discovery.facts.presets'), value: String(presets.length) },
    { label: t('entities.discovery.facts.activities'), value: String(activities.length) },
    { label: t('entities.discovery.facts.owners'), value: String(catalog.owners?.length || 0) }
  ];
}

export function buildDiscoveryMetrics(
  presets: EntityDiscoveryGovernancePreset[],
  catalog: EntityCatalogSuggestions,
  t: Translator
) {
  return [
    { label: t('entities.discovery.metrics.owners'), value: String(catalog.owners?.length || 0) },
    { label: t('entities.discovery.metrics.systems'), value: String(catalog.systems?.length || 0) },
    { label: t('entities.discovery.metrics.environments'), value: String(catalog.environments?.length || 0) },
    {
      label: t('entities.discovery.metrics.preset-coverage'),
      value: presets.length > 0 ? t('entities.discovery.metrics.ready') : t('entities.discovery.metrics.empty'),
      tone: presets.length > 0 ? 'success' : 'warning'
    }
  ];
}

export function buildCatalogRows(catalog: EntityCatalogSuggestions, t: Translator) {
  return [
    {
      title: t('entities.discovery.catalog.owners'),
      copy: (catalog.owners || []).slice(0, 6).join(', ') || t('entities.discovery.catalog.none'),
      meta: t('entities.discovery.catalog.count', { count: catalog.owners?.length || 0 })
    },
    {
      title: t('entities.discovery.catalog.systems'),
      copy: (catalog.systems || []).slice(0, 6).join(', ') || t('entities.discovery.catalog.none'),
      meta: t('entities.discovery.catalog.count', { count: catalog.systems?.length || 0 })
    },
    {
      title: t('entities.discovery.catalog.environments'),
      copy: (catalog.environments || []).slice(0, 6).join(', ') || t('entities.discovery.catalog.none'),
      meta: t('entities.discovery.catalog.count', { count: catalog.environments?.length || 0 })
    }
  ];
}

export function buildDiscoveryMonitorRows(monitors: Monitor[], t: Translator) {
  return monitors.map(monitor => {
    const status = localizeDiscoveryStatus(monitor.status, t);

    return {
      title: monitor.name || `#${monitor.id}`,
      copy: buildDiscoveryContextLine([monitor.app, monitor.instance], t),
      meta: buildDiscoveryContextLine([`#${monitor.id}`, status.label], t)
    };
  });
}

function emptyDiscoveryValue(t: Translator) {
  const translated = t('common.none');
  return translated === 'common.none' ? 'None' : translated;
}

function cleanCell(value: string | number | null | undefined, t: Translator) {
  const normalized = String(value ?? '').trim();
  return normalized || emptyDiscoveryValue(t);
}

function localizeDiscoveryStatus(value: string | number | null | undefined, t: Translator): { label: string; tone: DiscoveryStatusTone } {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'active') {
    return { label: t('entities.discovery.row.status.enabled'), tone: 'success' };
  }
  if (normalized === '0' || normalized === 'success') {
    return { label: t('entities.discovery.row.status.normal'), tone: 'success' };
  }
  if (normalized === '1' || normalized === 'critical' || normalized === 'down' || normalized === 'failed') {
    return { label: t('entities.discovery.row.status.abnormal'), tone: 'critical' };
  }
  if (normalized === '2' || normalized === 'pending' || normalized === 'warning' || normalized === 'warn') {
    return { label: t('entities.discovery.row.status.review'), tone: 'warning' };
  }
  return { label: t('entities.discovery.row.status.unknown', { status: cleanCell(value, t) }), tone: 'neutral' };
}

export function buildDiscoveryTableRows(
  monitors: Monitor[],
  presets: EntityDiscoveryGovernancePreset[],
  catalog: EntityCatalogSuggestions,
  t: Translator
): DiscoveryTableRow[] {
  if (monitors.length > 0) {
    return monitors.map(monitor => {
      const appKey = normalize(monitor.app);
      const matchingPreset =
        presets.find(preset => normalize(preset.system) === appKey) ||
        presets.find(preset => normalize(preset.name).includes(appKey)) ||
        presets[0];
      const draftOwner = pickDraftOwner(matchingPreset, catalog);
      const draftSystem = pickDraftSystem(monitor, matchingPreset, catalog);
      const draftEnvironment = pickDraftEnvironment(matchingPreset, catalog);
      const state = resolveGovernanceState(monitor, matchingPreset, catalog);
      const candidateName = matchingPreset?.name?.trim() || buildDiscoveryServiceName(monitor.app, t);
      const attribution = buildDiscoveryRowAttribution(state, monitor, candidateName, draftOwner, draftSystem, draftEnvironment, t);
      const status = localizeDiscoveryStatus(monitor.status, t);

      return {
        key: `monitor-${monitor.id}`,
        name: cleanCell(monitor.name || monitor.app || monitor.id, t),
        instance: cleanCell(monitor.instance, t),
        status: status.label,
        statusTone: status.tone,
        owner: cleanCell(draftOwner, t),
        system: cleanCell(draftSystem, t),
        environment: cleanCell(draftEnvironment, t),
        activity: t('entities.discovery.row.activity.search-result'),
        ...attribution
      };
    });
  }

  return presets.map((preset, index) => {
    const key = preset.id || String(index + 1);
    const system = cleanCell(preset.system || catalog.systems?.[0], t);
    const status = localizeDiscoveryStatus(preset.status, t);

    return {
      key: `preset-${key}`,
      name: cleanCell(preset.name, t),
      instance: system,
      status: status.label,
      statusTone: status.tone,
      owner: cleanCell(preset.owner || catalog.owners?.[0], t),
      system,
      environment: cleanCell(preset.environment || catalog.environments?.[0], t),
      activity: t('entities.discovery.row.activity.catalog-preset'),
      href: `/entities/discovery?preset=${encodeURIComponent(key)}`,
      attributionState: 'preset',
      attributionLabel: t('entities.discovery.row.attribution.preset.label'),
      attributionCopy: t('entities.discovery.row.attribution.preset.copy'),
      primaryActionLabel: t('entities.discovery.row.attribution.preset.action')
    };
  });
}

function isResolvedState(state: DiscoveryGovernanceState) {
  return state === 'resolved';
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() || '';
}

function humanize(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return '';
  }
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildDiscoveryServiceName(value: string | null | undefined, t: Translator) {
  return t('entities.discovery.service-name', { name: cleanCell(value, t) });
}

function buildDiscoveryContextLine(values: Array<string | number | null | undefined>, t: Translator) {
  return values.map(value => cleanCell(value, t)).join(' · ');
}

function pickDraftOwner(preset: EntityDiscoveryGovernancePreset | undefined, catalog: EntityCatalogSuggestions) {
  return preset?.owner?.trim() || catalog.owners?.[0]?.trim() || '';
}

function pickDraftSystem(monitor: Monitor, preset: EntityDiscoveryGovernancePreset | undefined, catalog: EntityCatalogSuggestions) {
  return monitor.app?.trim() || preset?.system?.trim() || catalog.systems?.[0]?.trim() || '';
}

function pickDraftEnvironment(preset: EntityDiscoveryGovernancePreset | undefined, catalog: EntityCatalogSuggestions) {
  return preset?.environment?.trim() || catalog.environments?.[0]?.trim() || '';
}

function buildDraftCompleteness(parts: Array<string | undefined>) {
  const completed = parts.filter(part => part != null && part.trim() !== '').length;
  return `${Math.round((completed / parts.length) * 100)}%`;
}

function buildDiscoveryHref(basePath: string, monitor: Monitor) {
  const params = new URLSearchParams({
    source: 'telemetry',
    monitorId: String(monitor.id)
  });
  return `${basePath}?${params.toString()}`;
}

function buildDiscoveryActionHref(monitor: Monitor, action: 'merge' | 'enrich') {
  return `${buildDiscoveryHref('/entities/discovery', monitor)}&action=${action}`;
}

function buildCandidateSearchHref(monitor: Monitor) {
  const query = monitor.app?.trim() || monitor.name?.trim() || String(monitor.id);
  return `/entities?search=${encodeURIComponent(query)}`;
}

function resolveGovernanceState(
  monitor: Monitor,
  preset: EntityDiscoveryGovernancePreset | undefined,
  catalog: EntityCatalogSuggestions
): DiscoveryGovernanceState {
  const appKey = normalize(monitor.app);
  const catalogSystems = (catalog.systems || []).map(item => normalize(item));
  const presetStatus = normalize(preset?.status);
  const hasCandidate = appKey !== '' && (normalize(preset?.system) === appKey || catalogSystems.includes(appKey));
  const hasOwner = pickDraftOwner(preset, catalog) !== '';
  const hasEnvironment = pickDraftEnvironment(preset, catalog) !== '';
  const hasSystem = pickDraftSystem(monitor, preset, catalog) !== '';

  if (presetStatus === 'resolved' || presetStatus === 'bound' || presetStatus === 'merged') {
    return 'resolved';
  }
  if (hasCandidate) {
    return 'merge';
  }
  if (!hasOwner || !hasEnvironment || !hasSystem) {
    return 'enrich';
  }
  return 'create';
}

function buildMissingGovernanceCopy(owner: string, system: string, environment: string, t: Translator) {
  const missingParts = [
    ...(owner ? [] : [t('entities.discovery.row.missing.owner')]),
    ...(system ? [] : [t('entities.discovery.row.missing.system')]),
    ...(environment ? [] : [t('entities.discovery.row.missing.environment')])
  ];
  return missingParts.length > 0
    ? t('entities.discovery.row.missing.copy', {
        fields: missingParts.join(t('entities.discovery.row.missing.separator'))
      })
    : t('entities.discovery.row.missing.ready');
}

function buildDiscoveryRowAttribution(
  state: DiscoveryGovernanceState,
  monitor: Monitor,
  candidateName: string,
  draftOwner: string,
  draftSystem: string,
  draftEnvironment: string,
  t: Translator
): Pick<DiscoveryTableRow, 'attributionCopy' | 'attributionLabel' | 'attributionState' | 'href' | 'primaryActionLabel'> {
  switch (state) {
    case 'resolved':
      return {
        attributionState: 'resolved',
        attributionLabel: t('entities.discovery.row.attribution.resolved.label'),
        attributionCopy: t('entities.discovery.row.attribution.resolved.copy'),
        href: buildCandidateSearchHref(monitor),
        primaryActionLabel: t('entities.discovery.row.attribution.resolved.action')
      };
    case 'merge':
      return {
        attributionState: 'merge',
        attributionLabel: t('entities.discovery.row.attribution.merge.label'),
        attributionCopy: t('entities.discovery.row.attribution.merge.copy', { candidate: candidateName }),
        href: buildDiscoveryActionHref(monitor, 'merge'),
        primaryActionLabel: t('entities.discovery.row.attribution.merge.action')
      };
    case 'enrich':
      return {
        attributionState: 'review',
        attributionLabel: t('entities.discovery.row.attribution.review.label'),
        attributionCopy: buildMissingGovernanceCopy(draftOwner, draftSystem, draftEnvironment, t),
        href: buildDiscoveryActionHref(monitor, 'enrich'),
        primaryActionLabel: t('entities.discovery.row.attribution.review.action')
      };
    default:
      return {
        attributionState: 'create',
        attributionLabel: t('entities.discovery.row.attribution.create.label'),
        attributionCopy: t('entities.discovery.row.attribution.create.copy'),
        href: buildDiscoveryHref('/entities/new', monitor),
        primaryActionLabel: t('entities.discovery.row.attribution.create.action')
      };
  }
}

function buildCardActions(state: DiscoveryGovernanceState, monitor: Monitor, t: Translator): DiscoveryGovernanceAction[] {
  switch (state) {
    case 'resolved':
      return [
        { label: t('entities.discovery.card.action.open-resolved'), href: buildCandidateSearchHref(monitor), kind: 'primary' },
        { label: t('entities.discovery.card.action.open-definition'), href: buildDiscoveryHref('/entities/import', monitor), kind: 'secondary' }
      ];
    case 'merge':
      return [
        { label: t('entities.discovery.card.action.merge-suggested'), href: `${buildDiscoveryHref('/entities/discovery', monitor)}&action=merge`, kind: 'primary' },
        { label: t('entities.discovery.card.action.open-definition'), href: buildDiscoveryHref('/entities/import', monitor), kind: 'secondary' },
        { label: t('entities.discovery.card.action.open-suggested'), href: buildCandidateSearchHref(monitor), kind: 'secondary' },
        { label: t('entities.discovery.card.action.adopt-draft'), href: buildDiscoveryHref('/entities/new', monitor), kind: 'link' }
      ];
    case 'enrich':
      return [
        { label: t('entities.discovery.card.action.review-governance'), href: `${buildDiscoveryHref('/entities/discovery', monitor)}&action=enrich`, kind: 'primary' },
        { label: t('entities.discovery.card.action.send-definition'), href: buildDiscoveryHref('/entities/import', monitor), kind: 'secondary' },
        { label: t('entities.discovery.card.action.adopt-draft'), href: buildDiscoveryHref('/entities/new', monitor), kind: 'link' }
      ];
    default:
      return [
        { label: t('entities.discovery.card.action.create-draft'), href: buildDiscoveryHref('/entities/new', monitor), kind: 'primary' },
        { label: t('entities.discovery.card.action.send-definition'), href: buildDiscoveryHref('/entities/import', monitor), kind: 'secondary' },
        { label: t('entities.discovery.card.action.adopt-draft'), href: buildDiscoveryHref('/entities/new', monitor), kind: 'link' }
      ];
  }
}

function buildRecommendation(state: DiscoveryGovernanceState, t: Translator) {
  switch (state) {
    case 'resolved':
      return t('entities.discovery.card.recommendation.resolved');
    case 'merge':
      return t('entities.discovery.card.recommendation.merge');
    case 'enrich':
      return t('entities.discovery.card.recommendation.enrich');
    default:
      return t('entities.discovery.card.recommendation.create');
  }
}

export function buildDiscoveryGovernanceCards(
  monitors: Monitor[],
  presets: EntityDiscoveryGovernancePreset[],
  catalog: EntityCatalogSuggestions,
  t: Translator
): DiscoveryGovernanceCard[] {
  return monitors.map(monitor => {
    const appKey = normalize(monitor.app);
    const matchingPreset =
      presets.find(preset => normalize(preset.system) === appKey) ||
      presets.find(preset => normalize(preset.name).includes(appKey)) ||
      presets[0];

    const draftOwner = pickDraftOwner(matchingPreset, catalog);
    const draftSystem = pickDraftSystem(monitor, matchingPreset, catalog);
    const draftEnvironment = pickDraftEnvironment(matchingPreset, catalog);
    const state = resolveGovernanceState(monitor, matchingPreset, catalog);
    const candidateName = matchingPreset?.name?.trim() || buildDiscoveryServiceName(monitor.app, t);

    return {
      key: `monitor-${monitor.id}`,
      title: monitor.name || `#${monitor.id}`,
      state,
      meta: buildDiscoveryContextLine([`#${monitor.id}`, monitor.app, monitor.instance], t),
      draftTitle: buildDiscoveryServiceName(monitor.name || humanize(monitor.app), t),
      draftSubtitle: buildDiscoveryContextLine([draftOwner, draftSystem, draftEnvironment], t),
      completeness: buildDraftCompleteness([monitor.name, draftOwner, draftSystem, draftEnvironment, monitor.instance]),
      riskLabel:
        state === 'resolved'
          ? t('entities.discovery.card.risk.low')
          : state === 'merge'
          ? t('entities.discovery.card.risk.medium')
          : state === 'enrich'
            ? t('entities.discovery.card.risk.high')
            : t('entities.discovery.card.risk.low'),
      nextActionLabel:
        state === 'resolved'
          ? t('entities.discovery.card.next.open')
          : state === 'merge'
            ? t('entities.discovery.card.next.merge')
            : state === 'enrich'
              ? t('entities.discovery.card.next.enrich')
              : t('entities.discovery.card.next.create'),
      recommendation: buildRecommendation(state, t),
      candidateLabel: state === 'merge' ? t('entities.discovery.card.candidate-label', { candidate: candidateName }) : undefined,
      candidateContext: state === 'merge' ? buildDiscoveryContextLine([draftOwner, draftSystem, draftEnvironment], t) : undefined,
      actions: buildCardActions(state, monitor, t)
    };
  });
}

export function buildDiscoveryScopeOptions(cards: DiscoveryGovernanceCard[], t: Translator): DiscoveryScopeOption[] {
  return [
    { key: 'all', label: t('entities.discovery.scope.all'), count: cards.length },
    { key: 'matched', label: t('entities.discovery.scope.matched'), count: cards.filter(card => card.state === 'merge').length },
    { key: 'resolved', label: t('entities.discovery.scope.resolved'), count: cards.filter(card => isResolvedState(card.state)).length },
    { key: 'new', label: t('entities.discovery.scope.suggested-new'), count: cards.filter(card => card.state === 'create' || card.state === 'enrich').length }
  ];
}

export function filterDiscoveryCardsByScope(cards: DiscoveryGovernanceCard[], scope: DiscoveryScope) {
  switch (scope) {
    case 'matched':
      return cards.filter(card => card.state === 'merge');
    case 'resolved':
      return cards.filter(card => isResolvedState(card.state));
    case 'new':
      return cards.filter(card => card.state === 'create' || card.state === 'enrich');
    default:
      return cards;
  }
}

export function buildDiscoveryIntakeQueueGroups(cards: DiscoveryGovernanceCard[], t: Translator): DiscoveryIntakeQueueGroup[] {
  const reviewCards = cards.filter(card => card.state === 'enrich');
  const mergeCards = cards.filter(card => card.state === 'merge');
  const createCards = cards.filter(card => card.state === 'create');
  const resolvedCards = cards.filter(card => isResolvedState(card.state));

  const groups: DiscoveryIntakeQueueGroup[] = [];

  if (reviewCards.length > 0) {
    groups.push({
      key: 'review',
      title: t('entities.discovery.queue.review.title'),
      summary: t('entities.discovery.queue.review.summary', { count: reviewCards.length }),
      actionLabel: t('entities.discovery.queue.review.action'),
      action: 'review',
      cardKeys: reviewCards.map(card => card.key),
      sampleTitles: reviewCards.slice(0, 3).map(card => card.title)
    });
  }

  if (mergeCards.length > 0) {
    groups.push({
      key: 'merge',
      title: t('entities.discovery.queue.merge.title'),
      summary: t('entities.discovery.queue.merge.summary', { count: mergeCards.length }),
      actionLabel: t('entities.discovery.queue.merge.action'),
      action: 'select-merge',
      cardKeys: mergeCards.map(card => card.key),
      sampleTitles: mergeCards.slice(0, 3).map(card => card.title)
    });
  }

  if (createCards.length > 0) {
    groups.push({
      key: 'create',
      title: t('entities.discovery.queue.create.title'),
      summary: t('entities.discovery.queue.create.summary', { count: createCards.length }),
      actionLabel: t('entities.discovery.queue.create.action'),
      action: 'select-create',
      cardKeys: createCards.map(card => card.key),
      sampleTitles: createCards.slice(0, 3).map(card => card.title)
    });
  }

  groups.push({
    key: 'resolved',
    title: t('entities.discovery.queue.resolved.title'),
    summary:
      resolvedCards.length > 0
        ? t('entities.discovery.queue.resolved.summary.present', { count: resolvedCards.length })
        : t('entities.discovery.queue.resolved.summary.empty'),
    actionLabel: t('entities.discovery.queue.resolved.action'),
    action: 'resolved',
    cardKeys: resolvedCards.map(card => card.key),
    sampleTitles: resolvedCards.slice(0, 3).map(card => card.title)
  });

  return groups;
}

export function buildDiscoveryBulkSummary(cards: DiscoveryGovernanceCard[], selectedKeys: Set<string>): DiscoveryBulkSummary {
  const selectedCards = cards.filter(card => selectedKeys.has(card.key));

  return {
    totalCount: cards.length,
    selectedCount: selectedCards.length,
    mergeReadyCount: selectedCards.filter(card => card.state === 'merge').length,
    createReadyCount: selectedCards.filter(card => card.state === 'create').length,
    reviewCount: selectedCards.filter(card => card.state === 'enrich').length
  };
}

export function buildDiscoveryBulkOverrideTags(drafts: DiscoveryBulkOverrideDrafts, t: Translator): DiscoveryBulkOverrideTag[] {
  const tags: DiscoveryBulkOverrideTag[] = [];
  const owner = drafts.ownerDraft?.trim();
  const system = drafts.systemDraft?.trim();

  if (owner) {
    tags.push({ label: t('entities.discovery.bulk.tag.owner'), value: owner });
  }

  if (system) {
    tags.push({ label: t('entities.discovery.bulk.tag.system'), value: system });
  }

  return tags;
}

export function buildDiscoveryBulkSuggestionChips(
  catalog: EntityCatalogSuggestions,
  presets: EntityDiscoveryGovernancePreset[],
  drafts: DiscoveryBulkOverrideDrafts,
  t: Translator
): DiscoveryBulkSuggestionSet {
  const ownerDraft = drafts.ownerDraft?.trim() || '';
  const systemDraft = drafts.systemDraft?.trim() || '';

  return {
    ownerChips: (catalog.owners || []).slice(0, 6).map(item => ({
      label: item,
      active: item.trim() === ownerDraft
    })),
    systemChips: (catalog.systems || []).slice(0, 6).map(item => ({
      label: item,
      active: item.trim() === systemDraft
    })),
    presetActions: presets
      .filter(preset => (preset.bulkOwner || '').trim() !== '' || (preset.bulkSystem || '').trim() !== '')
      .slice(0, 3)
      .map(preset => {
        const owner = (preset.bulkOwner || '').trim();
        const system = (preset.bulkSystem || '').trim();
        return {
          label: t('entities.discovery.bulk.preset.apply', { name: preset.name }),
          owner: owner || undefined,
          system: system || undefined,
          active: owner === ownerDraft && system === systemDraft
        };
      })
  };
}
