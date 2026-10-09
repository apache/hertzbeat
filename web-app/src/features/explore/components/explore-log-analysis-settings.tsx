/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { SettingOutlined } from '@ant-design/icons';
import { Button, Drawer, Tooltip } from 'antd';
import type { TFunction } from 'i18next';
import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { DEFAULT_LOG_ANALYSIS, validLogAnalysis, type LogAnalysisState } from '@/platform/perses';
import type { LogInspectorAnalysisIntent } from '../model/explore-log-inspector-analysis';
import type { LogFacetField } from '../model/explore-log-facets';
import { ExploreLogAnalysisControls } from './explore-log-analysis-controls';
import styles from './explore-log-representations.module.css';

type Props = {
  value: LogAnalysisState;
  fields: LogFacetField[];
  extraFields?: string[];
  onChange: (value: LogAnalysisState) => boolean | void;
  pending: boolean;
  invalid: boolean;
  unsupported?: boolean | undefined;
  rawDraft: string | undefined;
  focusIntent?: LogInspectorAnalysisIntent | undefined;
  onFocused?: (() => void) | undefined;
  t: TFunction;
  showTrigger?: boolean;
};

export function ExploreLogAnalysisSettings({
  value,
  fields,
  extraFields = [],
  onChange,
  pending,
  invalid,
  unsupported = false,
  rawDraft,
  focusIntent,
  onFocused,
  t,
  showTrigger = true
}: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const malformedDraft = rawDraft !== undefined && !validLogAnalysis(rawDraft);
  const requiresRecovery = malformedDraft || unsupported;
  const [recovered, setRecovered] = useState(!requiresRecovery);
  const handledIntent = useRef<LogInspectorAnalysisIntent | undefined>(undefined);
  const controls = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusIntent && handledIntent.current !== focusIntent) {
      setLocal(value);
      setRecovered(!requiresRecovery);
      setOpen(true);
    }
    handledIntent.current = focusIntent;
  }, [focusIntent, requiresRecovery, value]);
  useAnalysisFieldFocus(open, focusIntent, controls, onFocused);
  const close = () => setOpen(false);
  return (
    <>
      <span className={styles.analysisStatus} role={pending || invalid ? 'status' : undefined}>
        {invalid ? t('explore.logAnalysis.invalid') : pending ? t('explore.logAnalysis.pending') : null}
      </span>
      {showTrigger && (
        <Tooltip title={t('explore.logAnalysis.label')}>
          <Button
            aria-label={t('explore.logAnalysis.label')}
            icon={<SettingOutlined aria-hidden />}
            onClick={() => {
              setLocal(value);
              setRecovered(!requiresRecovery);
              setOpen(true);
            }}
          >
            {t('explore.logAnalysis.label')}
          </Button>
        </Tooltip>
      )}
      {open && (
        <SettingsDrawer
          {...{ close, recovered, local, onChange, t, malformedDraft, unsupported }}
          {...{ setLocal, setRecovered, fields, extraFields, controls }}
        />
      )}
    </>
  );
}

type SettingsDrawerProps = {
  close: () => void;
  recovered: boolean;
  local: LogAnalysisState;
  onChange: (value: LogAnalysisState) => boolean | void;
  t: TFunction;
  malformedDraft: boolean;
  unsupported: boolean;
  setLocal: Dispatch<SetStateAction<LogAnalysisState>>;
  setRecovered: Dispatch<SetStateAction<boolean>>;
  fields: LogFacetField[];
  extraFields: string[];
  controls: RefObject<HTMLDivElement>;
};
function SettingsDrawer({
  close,
  recovered,
  local,
  onChange,
  t,
  malformedDraft,
  unsupported,
  setLocal,
  setRecovered,
  fields,
  extraFields,
  controls
}: SettingsDrawerProps) {
  return (
    <Drawer
      open
      autoFocus={false}
      width={640}
      title={t('explore.logAnalysis.label')}
      onClose={close}
      footer={<AnalysisSettingsFooter {...{ close, recovered, local, onChange, t }} />}
    >
      {(malformedDraft || unsupported) && !recovered && (
        <p role="alert">
          {t(unsupported ? 'explore.logAnalysis.legacyUnsupported' : 'explore.logAnalysis.invalid')}{' '}
          <Button
            onClick={() => {
              setLocal({ ...DEFAULT_LOG_ANALYSIS });
              setRecovered(true);
            }}
          >
            {t('explore.logAnalysis.reset')}
          </Button>
        </p>
      )}
      <div ref={controls}>
        <ExploreLogAnalysisControls
          value={local}
          fields={fields}
          extraFields={extraFields}
          onChange={setLocal}
          pending={false}
          invalid={false}
          t={t}
        />
      </div>
    </Drawer>
  );
}

function AnalysisSettingsFooter({
  close,
  recovered,
  local,
  onChange,
  t
}: {
  close: () => void;
  recovered: boolean;
  local: LogAnalysisState;
  onChange: (value: LogAnalysisState) => boolean | void;
  t: TFunction;
}) {
  return (
    <>
      <Button onClick={close}>{t('common.cancel')}</Button>
      <Button
        type="primary"
        disabled={!recovered || !validLogAnalysis(JSON.stringify(local))}
        onClick={() => {
          if (onChange(local) !== false) close();
        }}
      >
        {t('common.confirm')}
      </Button>
    </>
  );
}

function useAnalysisFieldFocus(
  open: boolean,
  focusIntent: LogInspectorAnalysisIntent | undefined,
  controls: RefObject<HTMLDivElement>,
  onFocused: (() => void) | undefined
) {
  useEffect(() => {
    if (!open || !focusIntent) return;
    const timer = window.setTimeout(() => {
      const field = controls.current?.querySelector<HTMLSelectElement>(`[data-log-analysis-focus="${focusIntent}"]`);
      if (!field) return;
      field.focus();
      onFocused?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, focusIntent, controls, onFocused]);
}
