/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Grid, Select, Table } from 'antd';
import { useTranslation } from 'react-i18next';
import { OperationalStatePanel } from '@/shared/operational-page';
import { serviceSortKeys, type ServicePerformancePage } from '../model/service-performance-model';
import type { ServicesViewProps } from '../model/services-model';
import { performanceColumns } from './service-performance-columns';
import styles from './services-view.module.css';
export function ServicePerformanceDirectory({ state, actions }: ServicesViewProps) {
  const read = state.performance;
  const page = read?.kind === 'ready' ? read.data : undefined;
  const kind = !state.validWindow ? 'invalid' : (page?.state ?? read?.kind ?? 'loading');
  return (
    <>
      <PerformanceToolbar state={state} actions={actions} total={kind === 'ready' ? page?.totalElements : undefined} />
      <div className={kind === 'loading' ? styles.pendingPerformance : undefined}>
        <PerformanceContent state={state} actions={actions} kind={kind} page={page} />
      </div>
    </>
  );
}
function PerformanceContent({
  state,
  actions,
  kind,
  page
}: ServicesViewProps & { kind: string; page: ServicePerformancePage | undefined }) {
  if (kind !== 'ready' || !page) return <PerformanceState kind={kind} actions={actions} />;
  if (!page.content.length)
    return <ServiceDirectoryEmpty state={state} actions={actions} total={page.totalElements ?? 0} />;
  return <PerformanceResults state={state} actions={actions} page={page} />;
}
function PerformanceResults({ state, actions, page }: ServicesViewProps & { page: ServicePerformancePage }) {
  const { t } = useTranslation();
  const compact = Grid.useBreakpoint().sm === false;
  return (
    <>
      <Table
        size="small"
        rowKey={row => row.entity.id}
        columns={performanceColumns(t, actions, compact, state.query.sort)}
        dataSource={page.content}
        {...(compact ? { tableLayout: 'fixed' as const } : { scroll: { x: 1050 } })}
        pagination={{
          current: page.pageIndex + 1,
          pageSize: 10,
          total: page.totalElements ?? 0,
          showSizeChanger: false,
          onChange: index => actions.page(index - 1)
        }}
      />
    </>
  );
}
function PerformanceToolbar({ state, actions, total }: ServicesViewProps & { total: number | null | undefined }) {
  const { t } = useTranslation();
  return (
    <>
      <p className={styles.note}>{t('services.performanceScope')}</p>
      <div className={styles.performanceControls}>
        <span>{total == null ? t('services.directory') : t('services.resultCount', { count: total })}</span>
        <label>
          {t('services.sort')}
          <Select
            aria-label={t('services.sort')}
            value={state.query.sort ?? 'errorCount'}
            options={serviceSortKeys.map(value => ({ value, label: t(`services.sortKeys.${value}`) }))}
            onChange={sort => actions.directoryQuery({ sort })}
          />
        </label>
        <Select
          aria-label={t('services.order')}
          value={state.query.order ?? 'desc'}
          options={(['desc', 'asc'] as const).map(value => ({ value, label: t(`services.${value}`) }))}
          onChange={order => actions.directoryQuery({ order })}
        />
      </div>
    </>
  );
}
function PerformanceState({ kind, actions }: { kind: string; actions: ServicesViewProps['actions'] }) {
  const { t } = useTranslation();
  if (kind === 'loading')
    return <OperationalStatePanel presentation="quiet" kind="loading" title={t('services.state.loading')} />;
  return (
    <OperationalStatePanel
      presentation="quiet"
      kind={kind === 'permission' ? 'permission' : 'error'}
      title={t(
        kind === 'scope_too_large'
          ? 'services.scopeTooLarge'
          : kind === 'unavailable'
            ? 'services.performanceUnavailable'
            : `services.state.${kind}`
      )}
      description={t(kind === 'scope_too_large' ? 'services.narrowScope' : 'services.noRanking')}
      action={
        <>
          <Button onClick={actions.refresh}>{t('common.retry')}</Button>
          <Button onClick={() => actions.directoryQuery({ view: 'registered', sort: undefined, order: undefined })}>
            {t('services.registered')}
          </Button>
        </>
      }
    />
  );
}
export function ServiceDirectoryEmpty({ state, actions, total }: ServicesViewProps & { total: number }) {
  const { t } = useTranslation();
  const outOfRange = total > 0;
  const filtered = Boolean(state.query.search || state.query.environmentFilter);
  return (
    <OperationalStatePanel
      presentation="quiet"
      kind="empty"
      title={t(outOfRange ? 'services.pageEmpty' : 'services.empty')}
      description={t('services.unresolved')}
      action={
        outOfRange ? (
          <Button onClick={() => actions.page(0)}>{t('services.firstPage')}</Button>
        ) : filtered ? (
          <Button onClick={() => actions.directoryQuery({ search: '', environmentFilter: '' })}>
            {t('services.clearFilters')}
          </Button>
        ) : undefined
      }
    />
  );
}
