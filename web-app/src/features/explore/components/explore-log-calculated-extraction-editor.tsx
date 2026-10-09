/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ReactNode } from 'react';
import { Button, Input, Modal, Select } from 'antd';
import type { TFunction } from 'i18next';
import type { LogFacetField } from '../model/explore-log-facets';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';
import { useExtractionEditor } from './use-calculated-extraction-editor';
import styles from './explore-log-transaction-editor.module.css';

type Preview = { definitionId: string; values: Record<string, string | number | boolean | null> };
type Props = {
  raw: string | undefined;
  editingId?: string | undefined;
  search?: string | undefined;
  sort?: string | undefined;
  analysis?: string | undefined;
  validate: ValidateCalculatedFields;
  t: TFunction;
  onClose: () => void;
  onApply: (raw: string) => void;
  sources: LogFacetField[];
  modeControl: ReactNode;
};

export function ExploreLogCalculatedExtractionEditor(props: Props) {
  const editor = useExtractionEditor(props);
  return (
    <Modal
      title={props.t('explore.logCalculated.mode')}
      open
      onCancel={editor.cancel}
      footer={<ExtractionActions {...{ editor, t: props.t }} />}
    >
      <div className={styles.calculatedEditor}>
        {props.modeControl}
        <ExtractionInputs {...{ editor, t: props.t, sources: props.sources }} />
        {editor.error && (
          <p role="alert">
            {editor.errorPath && (
              <strong>{props.t(`explore.logCalculatedV2.validationPaths.${editor.errorPath}`)}: </strong>
            )}
            {props.t(`explore.logCalculatedV2.${editor.error}`)}
          </p>
        )}
        {editor.preview && <ExtractionPreview preview={editor.preview} t={props.t} />}
      </div>
    </Modal>
  );
}

function ExtractionInputs({
  editor,
  t,
  sources
}: {
  editor: ReturnType<typeof useExtractionEditor>;
  t: TFunction;
  sources: LogFacetField[];
}) {
  const sourceOptions = extractionSourceOptions(sources, t);
  return (
    <>
      <label>
        {t('explore.logCalculatedV2.source')}
        <Select
          aria-label={t('explore.logCalculatedV2.source')}
          showSearch
          optionFilterProp="label"
          value={editor.source}
          onChange={editor.setSource}
          options={sourceOptions}
        />
      </label>
      <label>
        {t('explore.logCalculatedV2.sample')}
        <Input.TextArea value={editor.sample} onChange={event => editor.setSample(event.target.value)} rows={2} />
      </label>
      <small>{t('explore.logCalculatedV2.sampleOnly')}</small>
      <div className={styles.extractionPatternRow}>
        <label>
          {t('explore.logCalculatedV2.pattern')}
          <Input.TextArea
            value={editor.pattern}
            onChange={event => editor.setPattern(event.target.value)}
            placeholder={editor.engine === 'regex' ? '^(?<token>[A-Za-z]+)$' : '^%{notSpace:token}$'}
            rows={3}
          />
        </label>
        <label>
          {t('explore.logCalculatedV2.engine')}
          <Select
            aria-label={t('explore.logCalculatedV2.engine')}
            value={editor.engine}
            onChange={editor.setEngine}
            options={[
              { value: 'grok', label: 'Grok' },
              { value: 'regex', label: 'Regex' }
            ]}
          />
        </label>
      </div>
      <small>
        {t(editor.engine === 'regex' ? 'explore.logCalculatedV2.regexHint' : 'explore.logCalculatedV2.grokMacros')}
      </small>
      {editor.capturePatternMissing && <small role="status">{t('explore.logCalculatedV2.namedCaptureRequired')}</small>}
      <Button disabled={!editor.canGenerate} onClick={editor.generate}>
        {t('explore.logCalculatedV2.generate')}
      </Button>
      {editor.multilineGrok && <small role="status">{t('explore.logCalculatedV2.grokMultilineUnsupported')}</small>}
    </>
  );
}

function extractionSourceOptions(sources: LogFacetField[], t: TFunction) {
  return [
    { value: 'builtin:body', label: t('explore.logCalculatedV2.messageBody') },
    ...sources
      .filter(field => field.id !== 'builtin:body')
      .map(field => ({
        value: field.id,
        label:
          field.source === 'builtin'
            ? t(`explore.logFacets.builtin.${field.key}`)
            : t(
                field.source === 'resource'
                  ? 'explore.logCalculatedV2.resourceSource'
                  : 'explore.logCalculatedV2.attributeSource',
                {
                  name: field.key
                }
              )
      }))
  ];
}

function ExtractionActions({ editor, t }: { editor: ReturnType<typeof useExtractionEditor>; t: TFunction }) {
  return (
    <div className={styles.calculatedActions}>
      <Button onClick={editor.cancel}>{t('common.cancel')}</Button>
      <Button loading={editor.pending} disabled={!editor.candidate} onClick={() => void editor.run(true)}>
        {t('explore.logCalculatedV2.preview')}
      </Button>
      <Button
        type="primary"
        loading={editor.pending}
        disabled={!editor.candidate}
        onClick={() => void editor.run(false)}
      >
        {t('common.confirm')}
      </Button>
    </div>
  );
}

function ExtractionPreview({ preview, t }: { preview: Preview; t: TFunction }) {
  return (
    <div aria-label={t('explore.logCalculatedV2.preview')}>
      <strong>{t('explore.logCalculatedV2.preview')}</strong>
      <dl className={styles.extractionPreview}>
        {Object.entries(preview.values).map(([name, value]) => (
          <div key={name}>
            <dt>#{name}</dt>
            <dd>
              {previewValue(value, t)}
              <small>{t(`explore.logCalculatedV2.previewTypes.${value === null ? 'null' : typeof value}`)}</small>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function previewValue(value: string | number | boolean | null, t: TFunction) {
  if (value === null) return t('explore.logCalculatedV2.noValue');
  if (value === '') return t('explore.logCalculatedV2.emptyValue');
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}
