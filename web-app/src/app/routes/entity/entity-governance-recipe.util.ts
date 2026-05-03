export type GovernanceRecipeKey = 'preset' | 'ownership' | 'definition' | 'telemetry' | 'registry';
export type GovernanceRecipePriority = 'high' | 'medium' | 'low';
export type GovernanceRegistrySource = 'shared' | 'local' | 'empty';
export type GovernanceRegistrySignalState = 'shared-fresh' | 'shared-stale' | 'local-fallback' | 'missing';

export interface GovernanceRecipePresentation {
  priority: GovernanceRecipePriority;
  priorityLabel: string;
  nextStep: string;
}

export interface GovernanceRegistrySignalPresentation extends GovernanceRecipePresentation {
  state: GovernanceRegistrySignalState;
  metric: string;
  summary: string;
}

export interface GovernanceRegistryPolicyPresentation {
  title: string;
  summary: string;
}

type TranslateFn = (key: string, fallback: string) => string;

export function buildGovernanceRecipePresentation(
  key: GovernanceRecipeKey,
  ready: boolean,
  translateOrFallback: TranslateFn
): GovernanceRecipePresentation {
  const priority: GovernanceRecipePriority = ready ? 'low' : key === 'preset' || key === 'ownership' || key === 'registry' ? 'high' : 'medium';
  return {
    priority,
    priorityLabel: translateOrFallback(`entity.governance.recipe.priority.${priority}`, getPriorityFallback(priority)),
    nextStep: translateOrFallback(`entity.governance.recipe.${key}.${ready ? 'ready' : 'pending'}`, getNextStepFallback(key, ready))
  };
}

export function buildGovernanceRegistrySignalPresentation(
  source: GovernanceRegistrySource,
  latestSharedTimestamp: string | undefined,
  translateOrFallback: TranslateFn
): GovernanceRegistrySignalPresentation {
  const state = resolveGovernanceRegistrySignalState(source, latestSharedTimestamp);
  const priority = getGovernanceRegistrySignalPriority(state);
  return {
    state,
    priority,
    priorityLabel: translateOrFallback(`entity.governance.recipe.priority.${priority}`, getPriorityFallback(priority)),
    metric: translateOrFallback(`entity.governance.registry.signal.${state}.metric`, getGovernanceRegistryMetricFallback(state)),
    summary: translateOrFallback(`entity.governance.registry.signal.${state}.summary`, getGovernanceRegistrySummaryFallback(state)),
    nextStep: translateOrFallback(`entity.governance.recipe.registry.${state}`, getGovernanceRegistryNextStepFallback(state))
  };
}

export function requiresGovernanceRegistryRemediation(signal: GovernanceRegistrySignalPresentation): boolean {
  return signal.state !== 'shared-fresh';
}

export function buildGovernanceRegistryPolicyPresentation(
  signal: GovernanceRegistrySignalPresentation,
  translateOrFallback: TranslateFn
): GovernanceRegistryPolicyPresentation {
  return {
    title: translateOrFallback(
      `entity.governance.registry.policy.${signal.state}.title`,
      getGovernanceRegistryPolicyTitleFallback(signal.state)
    ),
    summary: translateOrFallback(
      `entity.governance.registry.policy.${signal.state}.summary`,
      getGovernanceRegistryPolicySummaryFallback(signal.state)
    )
  };
}

function getPriorityFallback(priority: GovernanceRecipePriority): string {
  switch (priority) {
    case 'high':
      return '优先处理';
    case 'medium':
      return '继续收口';
    default:
      return '保持对齐';
  }
}

function getNextStepFallback(key: GovernanceRecipeKey, ready: boolean): string {
  switch (key) {
    case 'preset':
      return ready ? '保持共享预设对齐，并继续作为团队治理基线。' : '先按共享预设收敛负责人、系统、环境和来源偏差。';
    case 'ownership':
      return ready ? '保持负责人、系统和处置手册完整，并固化成团队治理基线。' : '先补齐负责人、系统和处置手册，再继续治理。';
    case 'definition':
      return ready ? '继续用定义工作台承接定义质量和生命周期治理。' : '先完成定义预览和导入，再接定义质量治理。';
    case 'registry':
      return ready ? '保持共享目录新鲜度，并继续把治理动作沉到统一目录历史。' : '先把共享目录状态收紧，再继续使用评分钩子和治理策略。';
    case 'telemetry':
    default:
      return ready ? '继续沿统一证据入口承接告警、日志和监控。' : '先补齐身份标识和监控绑定，再继续发现和归并。';
  }
}

function resolveGovernanceRegistrySignalState(
  source: GovernanceRegistrySource,
  latestSharedTimestamp: string | undefined
): GovernanceRegistrySignalState {
  if (source === 'local') {
    return 'local-fallback';
  }
  if (source === 'empty') {
    return 'missing';
  }
  return isRecentGovernanceTimestamp(latestSharedTimestamp) ? 'shared-fresh' : 'shared-stale';
}

function isRecentGovernanceTimestamp(value: string | undefined): boolean {
  if (value == null) {
    return false;
  }
  const happenedAt = new Date(value).getTime();
  if (Number.isNaN(happenedAt)) {
    return false;
  }
  return Date.now() - happenedAt <= 24 * 60 * 60 * 1000;
}

function getGovernanceRegistrySignalPriority(state: GovernanceRegistrySignalState): GovernanceRecipePriority {
  switch (state) {
    case 'shared-fresh':
      return 'low';
    case 'shared-stale':
      return 'medium';
    case 'local-fallback':
    case 'missing':
    default:
      return 'high';
  }
}

function getGovernanceRegistryMetricFallback(state: GovernanceRegistrySignalState): string {
  switch (state) {
    case 'shared-fresh':
      return '共享目录 · 已同步';
    case 'shared-stale':
      return '共享目录 · 待刷新';
    case 'local-fallback':
      return '本地回退 · 待同步';
    case 'missing':
    default:
      return '共享目录 · 待建立';
  }
}

function getGovernanceRegistrySummaryFallback(state: GovernanceRegistrySignalState): string {
  switch (state) {
    case 'shared-fresh':
      return '当前工作台已经跟上共享目录最近一次治理状态，可以直接作为后续评分卡和策略校验的统一来源。';
    case 'shared-stale':
      return '当前工作台仍在沿用共享目录，但最近一次共享快照已经偏旧，建议先刷新再继续治理。';
    case 'local-fallback':
      return '当前工作台仍依赖本地回退，其他页面和其他设备还看不到这组治理口径，建议先同步到共享目录。';
    case 'missing':
    default:
      return '当前还没有共享目录基线，建议先沉淀一组可复用的治理口径，再让后续治理动作都沿用同一来源。';
  }
}

function getGovernanceRegistryNextStepFallback(state: GovernanceRegistrySignalState): string {
  switch (state) {
    case 'shared-fresh':
      return '保持共享目录新鲜度，并继续把治理动作沉到统一目录历史。';
    case 'shared-stale':
      return '先刷新共享目录，再继续处理预设偏差、定义治理和证据收敛。';
    case 'local-fallback':
      return '先把本地回退同步到共享目录，再继续推进治理和评分卡收口。';
    case 'missing':
    default:
      return '先建立共享目录基线，再让发现、定义和详情工作台沿用同一套治理来源。';
  }
}

function getGovernanceRegistryPolicyTitleFallback(state: GovernanceRegistrySignalState): string {
  switch (state) {
    case 'shared-fresh':
      return '保持共享目录新鲜度';
    case 'shared-stale':
      return '刷新共享目录基线';
    case 'local-fallback':
      return '同步本地回退到共享目录';
    case 'missing':
    default:
      return '先建立共享目录基线';
  }
}

function getGovernanceRegistryPolicySummaryFallback(state: GovernanceRegistrySignalState): string {
  switch (state) {
    case 'shared-fresh':
      return '当前工作台已经和共享目录保持一致，可以继续把精力放在定义质量、归并和证据收敛上。';
    case 'shared-stale':
      return '共享目录里的治理快照已经偏旧，建议先刷新共享目录，再继续处理预设偏差和证据收敛。';
    case 'local-fallback':
      return '当前工作台还在依赖本地回退，其他页面和其他设备看不到同一套治理口径，建议先同步到共享目录。';
    case 'missing':
    default:
      return '当前还没有共享目录基线，建议先沉淀一组可复用的治理预设，再继续推进 discovery、definition 和 detail。';
  }
}
