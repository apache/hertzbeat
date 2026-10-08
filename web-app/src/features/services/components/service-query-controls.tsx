/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { globalTimeRanges, type GlobalTimeRange } from '@/shared/time';
import { OperationalCommandBar } from '@/shared/operational-page';
import type { ServicesViewProps } from '../model/services-model';
import styles from './services-view.module.css';

export function ServiceQueryControls({ state, actions }: ServicesViewProps) {
  const { t } = useTranslation();
  return (
    <OperationalCommandBar
      secondary={
        <span className={styles.window}>{state.validWindow ? state.timeLabel : t('services.invalidWindow')}</span>
      }
      primary={
        <form
          className={styles.filters}
          onSubmit={event => {
            event.preventDefault();
            actions.query();
          }}
        >
          {!state.query.entityId && (
            <>
              <Input
                aria-label={t('services.search')}
                placeholder={t('services.search')}
                value={state.draft.search}
                onChange={event => actions.updateDraft({ ...state.draft, search: event.target.value })}
              />
              <Input
                aria-label={t('services.environmentFilter')}
                placeholder={t('services.environmentFilter')}
                value={state.draft.environment}
                onChange={event => actions.updateDraft({ ...state.draft, environment: event.target.value })}
              />
            </>
          )}
          <Select<string>
            className={styles.range ?? ''}
            aria-label={t('services.timeRange')}
            value={state.draft.range ?? 'exact'}
            options={[
              { value: 'exact', label: t('services.exactWindow') },
              ...globalTimeRanges.map(range => ({ value: range, label: t('shell.time.rangeOption', { range }) }))
            ]}
            onChange={range =>
              actions.updateDraft({
                ...state.draft,
                range: range === 'exact' ? undefined : (range as GlobalTimeRange)
              })
            }
          />
          <Button type="primary" htmlType="submit" disabled={!state.validWindow && !state.draft.range}>
            {t('services.query')}
          </Button>
        </form>
      }
    />
  );
}
