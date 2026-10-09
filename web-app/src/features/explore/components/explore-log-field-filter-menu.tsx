/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import { logColumnLabel } from '../model/explore-log-columns';
import { searchFieldName } from '../model/explore-log-search-authoring';
import {
  logInspectorFilterDisabledReason,
  type LogInspectorFilterControls,
  type LogInspectorFilterTarget
} from '../model/explore-log-inspector-filter';
import type { InspectorField } from './explore-log-inspector-model';
import styles from './explore-log-inspector-fields.module.css';

export function logFilterMenuItems(field: InspectorField, controls: LogInspectorFilterControls, t: TFunction) {
  const items: NonNullable<MenuProps['items']> = [];
  if (!field.filter || !controls.onAddLogFilter) return items;
  const target = field.filter;
  for (const operator of ['=', '!='] as const) items.push(equalityItem(target, operator, controls, t));
  const replaceReason = logInspectorFilterDisabledReason(
    controls.logFilterDraft ?? {},
    target,
    '=',
    controls.logFilterScope,
    'replace'
  );
  items.push({
    key: 'replace-filter',
    disabled: Boolean(replaceReason),
    label: (
      <span>
        {t('explore.logFieldMenu.replaceFilter')}
        {replaceReason && (
          <small className={styles.menuReason}>{t(filterReasonKey(replaceReason, controls, false))}</small>
        )}
      </span>
    ),
    onClick: () => controls.onAddLogFilter?.(target, '=', 'replace')
  });
  return items;
}

function equalityItem(
  target: LogInspectorFilterTarget,
  operator: '=' | '!=',
  controls: LogInspectorFilterControls,
  t: TFunction
) {
  const reason = logInspectorFilterDisabledReason(
    controls.logFilterDraft ?? {},
    target,
    operator,
    controls.logFilterScope
  );
  const label = t(operator === '=' ? 'explore.perses.includeField' : 'explore.perses.excludeField', {
    field: target.collection ? [target.key, ...(target.children ?? [])].join(' › ') : filterFieldLabel(target, t)
  });
  const description = reason
    ? t(filterReasonKey(reason, controls, Boolean(target.contextField) && operator === '!='))
    : undefined;
  return {
    key: operator,
    disabled: Boolean(reason),
    label: (
      <span>
        {label}
        {target.collection && (
          <small className={styles.menuReason}>{t('explore.logFieldMenu.collectionAnyMember')}</small>
        )}
        {description && <small className={styles.menuReason}>{description}</small>}
      </span>
    ),
    onClick: () => controls.onAddLogFilter?.(target, operator)
  };
}

function filterFieldLabel(target: LogInspectorFilterTarget, t: TFunction) {
  if (target.scope !== 'builtin') {
    const source = target.scope === 'resource' ? 'resource' : 'attribute';
    const field = { id: `${source}:${target.key}`, source, key: target.key } as const;
    const name = searchFieldName(field);
    return target.children?.length ? `${name} › ${target.children.join(' › ')}` : name;
  }
  if (target.key === 'status')
    return searchFieldName({ id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' });
  if (target.key === 'trace_id' || target.key === 'span_id')
    return logColumnLabel({ kind: target.key === 'trace_id' ? 'traceId' : 'spanId' }, t);
  return target.key;
}

function filterReasonKey(
  reason: 'scope-locked' | 'legacy-value' | 'invalid' | 'unsupported-collection',
  controls: LogInspectorFilterControls,
  contextExclusion: boolean
) {
  if (reason === 'scope-locked') return 'explore.perses.scopeLockedFilter';
  if (reason === 'unsupported-collection') return 'explore.logFieldMenu.filterUnsupported';
  if (reason === 'legacy-value') return 'explore.logFieldMenu.legacyValue';
  if (contextExclusion) return 'explore.logFieldMenu.contextExclusion';
  if (controls.logFilterDraft?.searchSyntax !== 'structured-v1') return 'explore.perses.editExistingFilter';
  return 'explore.logFieldMenu.invalid';
}
