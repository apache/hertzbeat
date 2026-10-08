/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { SettingOutlined } from '@ant-design/icons';
import { Button, Popover, Radio, Switch } from 'antd';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';

import type { LogColumn, LogColumnControls } from '../model/explore-log-columns';
import type { LogSortControls } from '../model/explore-log-order';
import type { LogExploreQuery } from '../model/explore-query';
import type { ExploreLogDisplayPreferences } from './explore-log-display-preferences';
import { ExploreLogColumns } from './explore-log-columns';
import styles from './explore-log-result-options.module.css';

type Props = {
  logOrder?: LogSortControls | undefined;
  logColumns?: LogColumnControls | undefined;
  availableColumns?: LogColumn[] | undefined;
  query: LogExploreQuery;
  preferences: ExploreLogDisplayPreferences;
  onPreferencesChange: (preferences: ExploreLogDisplayPreferences) => void;
  t: TFunction;
};

export function ExploreLogResultOptions(props: Props) {
  const { logColumns, availableColumns, query, preferences, onPreferencesChange, t } = props;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      autoAdjustOverflow
      align={{ offset: [0, 0], overflow: { adjustX: true, adjustY: true, shiftX: true, shiftY: true } }}
      destroyOnHidden
      open={open}
      onOpenChange={setOpen}
      content={
        <div
          className={styles.optionsSurface}
          data-columns={Boolean(logColumns)}
          onKeyDown={event => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
          }}
        >
          {!query.live && (
            <>
              <div className={styles.optionSection}>
                <PreferenceToggle
                  label={t('explore.perses.timelineGraph')}
                  checked={preferences.showTimeline ?? true}
                  onChange={showTimeline => onPreferencesChange({ ...preferences, showTimeline })}
                />
                <PreferenceToggle
                  label={t('explore.perses.standardizeHeaders')}
                  checked={preferences.standardizeHeaders ?? true}
                  onChange={standardizeHeaders => onPreferencesChange({ ...preferences, standardizeHeaders })}
                />
              </div>
            </>
          )}
          <div className={styles.optionSection}>
            <h4>{t('explore.logColumns.title')}</h4>
            <PreferenceToggle
              label={t('explore.perses.showDateColumn')}
              checked={preferences.showTime}
              onChange={showTime => onPreferencesChange({ ...preferences, showTime })}
            />
            <PreferenceToggle
              label={t('explore.perses.showContentColumn')}
              checked={preferences.showContent ?? true}
              onChange={showContent => onPreferencesChange({ ...preferences, showContent })}
            />
          </div>
          <div className={styles.optionSection}>
            <RowHeights preferences={preferences} onChange={onPreferencesChange} t={t} />
          </div>
          {!query.live && (
            <div className={styles.optionSection}>
              <DisplayModes preferences={preferences} onChange={onPreferencesChange} t={t} />
            </div>
          )}
          {logColumns && (
            <div className={styles.columnSection}>
              <ExploreLogColumns controls={logColumns} availableColumns={availableColumns} />
            </div>
          )}
        </div>
      }
    >
      <Button
        ref={trigger}
        className={styles.optionsButton ?? ''}
        aria-expanded={open}
        onKeyDown={event => {
          if (event.key !== 'Escape' || !open) return;
          event.stopPropagation();
          setOpen(false);
        }}
      >
        <SettingOutlined aria-hidden /> {t('explore.perses.options')}
      </Button>
    </Popover>
  );
}

function PreferenceToggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span>{label}</span>
      <Switch aria-label={label} checked={checked} onChange={onChange} />
    </label>
  );
}

function RowHeights({
  preferences,
  onChange,
  t
}: Pick<Props, 'preferences' | 't'> & { onChange: Props['onPreferencesChange'] }) {
  return (
    <fieldset className={styles.radioSection}>
      <legend>{t('explore.perses.rowHeight')}</legend>
      <div className={styles.heightOptions} role="radiogroup" aria-label={t('explore.perses.rowHeight')}>
        <Radio.Group
          value={preferences.rowHeight ?? 'small'}
          onChange={event =>
            onChange({
              ...preferences,
              rowHeight: event.target.value as NonNullable<ExploreLogDisplayPreferences['rowHeight']>
            })
          }
        >
          <Radio.Button value="small" aria-label={t('explore.perses.rowHeightSmall')}>
            S
          </Radio.Button>
          <Radio.Button value="medium" aria-label={t('explore.perses.rowHeightMedium')}>
            M
          </Radio.Button>
          <Radio.Button value="large" aria-label={t('explore.perses.rowHeightLarge')}>
            L
          </Radio.Button>
        </Radio.Group>
      </div>
    </fieldset>
  );
}

function DisplayModes({
  preferences,
  onChange,
  t
}: Pick<Props, 'preferences' | 't'> & { onChange: Props['onPreferencesChange'] }) {
  return (
    <fieldset className={styles.radioSection}>
      <legend>{t('explore.perses.contentDisplay')}</legend>
      <div className={styles.displayModes} role="radiogroup" aria-label={t('explore.perses.contentDisplay')}>
        <Radio.Group
          value={preferences.contentDisplay ?? 'message'}
          onChange={event =>
            onChange({
              ...preferences,
              contentDisplay: event.target.value as NonNullable<ExploreLogDisplayPreferences['contentDisplay']>
            })
          }
        >
          <Radio value="message">{t('explore.perses.displayMessage')}</Radio>
          <Radio value="attributes">{t('explore.perses.displayAttributes')}</Radio>
          <Radio value="stack">{t('explore.perses.displayStack')}</Radio>
        </Radio.Group>
      </div>
    </fieldset>
  );
}
