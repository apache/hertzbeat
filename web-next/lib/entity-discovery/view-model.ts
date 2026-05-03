import type { EntityCatalogSuggestions, EntityDiscoveryGovernanceActivity, EntityDiscoveryGovernancePreset, Monitor } from '@/lib/types';

export type DiscoveryGovernanceActionKind = 'primary' | 'secondary' | 'link';

export type DiscoveryGovernanceState = 'merge' | 'create' | 'enrich' | 'resolved';

export type DiscoveryAttributionState = 'merge' | 'create' | 'review' | 'resolved' | 'preset';

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
  catalog: EntityCatalogSuggestions
) {
  return [
    { label: 'Workspace', value: 'entities/discovery' },
    { label: 'Presets', value: String(presets.length) },
    { label: 'Activities', value: String(activities.length) },
    { label: 'Owners', value: String(catalog.owners?.length || 0) }
  ];
}

export function buildDiscoveryMetrics(
  presets: EntityDiscoveryGovernancePreset[],
  catalog: EntityCatalogSuggestions
) {
  return [
    { label: 'owners', value: String(catalog.owners?.length || 0) },
    { label: 'systems', value: String(catalog.systems?.length || 0) },
    { label: 'environments', value: String(catalog.environments?.length || 0) },
    { label: 'preset coverage', value: presets.length > 0 ? 'ready' : 'empty', tone: presets.length > 0 ? 'success' : 'warning' }
  ];
}

export function buildCatalogRows(catalog: EntityCatalogSuggestions) {
  return [
    { title: 'owners', copy: (catalog.owners || []).slice(0, 6).join(', ') || '-', meta: `count ${catalog.owners?.length || 0}` },
    { title: 'systems', copy: (catalog.systems || []).slice(0, 6).join(', ') || '-', meta: `count ${catalog.systems?.length || 0}` },
    { title: 'environments', copy: (catalog.environments || []).slice(0, 6).join(', ') || '-', meta: `count ${catalog.environments?.length || 0}` }
  ];
}

export function buildDiscoveryMonitorRows(monitors: Monitor[]) {
  return monitors.map(monitor => ({
    title: monitor.name || `#${monitor.id}`,
    copy: [monitor.app || '-', monitor.instance || '-'].join(' · '),
    meta: `#${monitor.id} · status ${monitor.status}`
  }));
}

function cleanCell(value?: string | number | null) {
  const normalized = String(value ?? '').trim();
  return normalized || '-';
}

function localizeDiscoveryStatus(value?: string | number | null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === '0' || normalized === 'active' || normalized === 'success') {
    return normalized === 'active' ? '已启用' : '正常';
  }
  if (normalized === '1' || normalized === 'critical' || normalized === 'down' || normalized === 'failed') {
    return '异常';
  }
  if (normalized === '2' || normalized === 'pending' || normalized === 'warning' || normalized === 'warn') {
    return '待确认';
  }
  return cleanCell(value);
}

export function buildDiscoveryTableRows(
  monitors: Monitor[],
  presets: EntityDiscoveryGovernancePreset[],
  catalog: EntityCatalogSuggestions
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
      const candidateName = matchingPreset?.name?.trim() || `${humanize(monitor.app)} service`;
      const attribution = buildDiscoveryRowAttribution(state, monitor, candidateName, draftOwner, draftSystem, draftEnvironment);

      return {
        key: `monitor-${monitor.id}`,
        name: cleanCell(monitor.name || monitor.app || monitor.id),
        instance: cleanCell(monitor.instance),
        status: localizeDiscoveryStatus(monitor.status),
        owner: cleanCell(draftOwner),
        system: cleanCell(draftSystem),
        environment: cleanCell(draftEnvironment),
        activity: '搜索结果',
        ...attribution
      };
    });
  }

  return presets.map((preset, index) => {
    const key = preset.id || String(index + 1);
    const system = cleanCell(preset.system || catalog.systems?.[0]);

    return {
      key: `preset-${key}`,
      name: cleanCell(preset.name),
      instance: system,
      status: localizeDiscoveryStatus(preset.status),
      owner: cleanCell(preset.owner || catalog.owners?.[0]),
      system,
      environment: cleanCell(preset.environment || catalog.environments?.[0]),
      activity: '目录预设',
      href: `/entities/discovery?preset=${encodeURIComponent(key)}`,
      attributionState: 'preset',
      attributionLabel: '目录预设',
      attributionCopy: '可作为候选确认基线',
      primaryActionLabel: '查看预设'
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
    return 'Unknown';
  }
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function buildMissingGovernanceCopy(owner: string, system: string, environment: string) {
  const missingParts = [
    ...(owner ? [] : ['负责人']),
    ...(system ? [] : ['系统']),
    ...(environment ? [] : ['环境'])
  ];
  return missingParts.length > 0 ? `缺少${missingParts.join('、')}` : '归因上下文待确认';
}

function buildDiscoveryRowAttribution(
  state: DiscoveryGovernanceState,
  monitor: Monitor,
  candidateName: string,
  draftOwner: string,
  draftSystem: string,
  draftEnvironment: string
): Pick<DiscoveryTableRow, 'attributionCopy' | 'attributionLabel' | 'attributionState' | 'href' | 'primaryActionLabel'> {
  switch (state) {
    case 'resolved':
      return {
        attributionState: 'resolved',
        attributionLabel: '已归因',
        attributionCopy: '已归入对象目录',
        href: buildCandidateSearchHref(monitor),
        primaryActionLabel: '打开实体'
      };
    case 'merge':
      return {
        attributionState: 'merge',
        attributionLabel: '建议归并',
        attributionCopy: `候选实体 ${candidateName}`,
        href: buildDiscoveryActionHref(monitor, 'merge'),
        primaryActionLabel: '确认归并'
      };
    case 'enrich':
      return {
        attributionState: 'review',
        attributionLabel: '归因待补齐',
        attributionCopy: buildMissingGovernanceCopy(draftOwner, draftSystem, draftEnvironment),
        href: buildDiscoveryActionHref(monitor, 'enrich'),
        primaryActionLabel: '补齐归因'
      };
    default:
      return {
        attributionState: 'create',
        attributionLabel: '建议新建',
        attributionCopy: '已有监控线索，可创建实体草稿',
        href: buildDiscoveryHref('/entities/new', monitor),
        primaryActionLabel: '创建实体'
      };
  }
}

function buildCardActions(state: DiscoveryGovernanceState, monitor: Monitor): DiscoveryGovernanceAction[] {
  switch (state) {
    case 'resolved':
      return [
        { label: 'Open resolved entity', href: buildCandidateSearchHref(monitor), kind: 'primary' },
        { label: 'Open definition', href: buildDiscoveryHref('/entities/import', monitor), kind: 'secondary' }
      ];
    case 'merge':
      return [
        { label: 'Merge into suggested entity', href: `${buildDiscoveryHref('/entities/discovery', monitor)}&action=merge`, kind: 'primary' },
        { label: 'Open definition', href: buildDiscoveryHref('/entities/import', monitor), kind: 'secondary' },
        { label: 'Open suggested entity', href: buildCandidateSearchHref(monitor), kind: 'secondary' },
        { label: 'Adopt as draft', href: buildDiscoveryHref('/entities/new', monitor), kind: 'link' }
      ];
    case 'enrich':
      return [
        { label: 'Review governance', href: `${buildDiscoveryHref('/entities/discovery', monitor)}&action=enrich`, kind: 'primary' },
        { label: 'Send to definition workspace', href: buildDiscoveryHref('/entities/import', monitor), kind: 'secondary' },
        { label: 'Adopt as draft', href: buildDiscoveryHref('/entities/new', monitor), kind: 'link' }
      ];
    default:
      return [
        { label: 'Create entity draft', href: buildDiscoveryHref('/entities/new', monitor), kind: 'primary' },
        { label: 'Send to definition workspace', href: buildDiscoveryHref('/entities/import', monitor), kind: 'secondary' },
        { label: 'Adopt as draft', href: buildDiscoveryHref('/entities/new', monitor), kind: 'link' }
      ];
  }
}

function buildRecommendation(state: DiscoveryGovernanceState) {
  switch (state) {
    case 'resolved':
      return 'This telemetry has already been folded into the catalog, so the next step is to reopen the resolved entity or its definition workspace.';
    case 'merge':
      return 'A matching directory candidate already exists, so this telemetry should merge before a new draft is created.';
    case 'enrich':
      return 'Fill the shared governance context first, then send the monitor into the definition workspace or create a draft.';
    default:
      return 'This telemetry already has enough shared governance context to open a new entity draft right away.';
  }
}

export function buildDiscoveryGovernanceCards(
  monitors: Monitor[],
  presets: EntityDiscoveryGovernancePreset[],
  catalog: EntityCatalogSuggestions
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
    const candidateName = matchingPreset?.name?.trim() || `${humanize(monitor.app)} service`;

    return {
      key: `monitor-${monitor.id}`,
      title: monitor.name || `#${monitor.id}`,
      state,
      meta: [`#${monitor.id}`, monitor.app || '-', monitor.instance || '-'].join(' · '),
      draftTitle: `${monitor.name || humanize(monitor.app)} service`,
      draftSubtitle: [draftOwner || '-', draftSystem || '-', draftEnvironment || '-'].join(' · '),
      completeness: buildDraftCompleteness([monitor.name, draftOwner, draftSystem, draftEnvironment, monitor.instance]),
      riskLabel:
        state === 'resolved'
          ? 'Governance risk low'
          : state === 'merge'
          ? 'Governance risk medium'
          : state === 'enrich'
            ? 'Governance risk high'
            : 'Governance risk low',
      nextActionLabel:
        state === 'resolved'
          ? 'Next step open'
          : state === 'merge'
            ? 'Next step merge'
            : state === 'enrich'
              ? 'Next step enrich'
              : 'Next step create',
      recommendation: buildRecommendation(state),
      candidateLabel: state === 'merge' ? `Suggested entity · ${candidateName} · score strong` : undefined,
      candidateContext: state === 'merge' ? [draftOwner || '-', draftSystem || '-', draftEnvironment || '-'].join(' · ') : undefined,
      actions: buildCardActions(state, monitor)
    };
  });
}

export function buildDiscoveryScopeOptions(cards: DiscoveryGovernanceCard[]): DiscoveryScopeOption[] {
  return [
    { key: 'all', label: 'All', count: cards.length },
    { key: 'matched', label: 'Matched', count: cards.filter(card => card.state === 'merge').length },
    { key: 'resolved', label: 'Resolved', count: cards.filter(card => isResolvedState(card.state)).length },
    { key: 'new', label: 'Suggested new', count: cards.filter(card => card.state === 'create' || card.state === 'enrich').length }
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

export function buildDiscoveryIntakeQueueGroups(cards: DiscoveryGovernanceCard[]): DiscoveryIntakeQueueGroup[] {
  const reviewCards = cards.filter(card => card.state === 'enrich');
  const mergeCards = cards.filter(card => card.state === 'merge');
  const createCards = cards.filter(card => card.state === 'create');
  const resolvedCards = cards.filter(card => isResolvedState(card.state));

  const groups: DiscoveryIntakeQueueGroup[] = [];

  if (reviewCards.length > 0) {
    groups.push({
      key: 'review',
      title: 'Needs governance review',
      summary: `${reviewCards.length} telemetry result${reviewCards.length === 1 ? '' : 's'} still need governance review before they can be merged or created.`,
      actionLabel: 'Review governance',
      action: 'review',
      cardKeys: reviewCards.map(card => card.key),
      sampleTitles: reviewCards.slice(0, 3).map(card => card.title)
    });
  }

  if (mergeCards.length > 0) {
    groups.push({
      key: 'merge',
      title: 'Ready to merge',
      summary: `${mergeCards.length} telemetry result${mergeCards.length === 1 ? '' : 's'} can be selected for merge immediately.`,
      actionLabel: 'Select merge-ready',
      action: 'select-merge',
      cardKeys: mergeCards.map(card => card.key),
      sampleTitles: mergeCards.slice(0, 3).map(card => card.title)
    });
  }

  if (createCards.length > 0) {
    groups.push({
      key: 'create',
      title: 'Suggested new entities',
      summary: `${createCards.length} telemetry result${createCards.length === 1 ? '' : 's'} are ready to open as new entity drafts or send into the definition workspace.`,
      actionLabel: 'Select suggested new',
      action: 'select-create',
      cardKeys: createCards.map(card => card.key),
      sampleTitles: createCards.slice(0, 3).map(card => card.title)
    });
  }

  groups.push({
    key: 'resolved',
    title: 'Already resolved',
    summary:
      resolvedCards.length > 0
        ? `${resolvedCards.length} telemetry result${resolvedCards.length === 1 ? '' : 's'} already map to resolved catalog entities.`
        : 'No discovery results are marked as resolved yet.',
    actionLabel: 'View resolved',
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

export function buildDiscoveryBulkOverrideTags(drafts: DiscoveryBulkOverrideDrafts): DiscoveryBulkOverrideTag[] {
  const tags: DiscoveryBulkOverrideTag[] = [];
  const owner = drafts.ownerDraft?.trim();
  const system = drafts.systemDraft?.trim();

  if (owner) {
    tags.push({ label: 'Owner', value: owner });
  }

  if (system) {
    tags.push({ label: 'System', value: system });
  }

  return tags;
}

export function buildDiscoveryBulkSuggestionChips(
  catalog: EntityCatalogSuggestions,
  presets: EntityDiscoveryGovernancePreset[],
  drafts: DiscoveryBulkOverrideDrafts
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
          label: `Apply ${preset.name}`,
          owner: owner || undefined,
          system: system || undefined,
          active: owner === ownerDraft && system === systemDraft
        };
      })
  };
}
