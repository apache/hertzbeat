/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { AutoComplete, Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  entityCriticalities,
  entityTypes,
  type EntityCatalogSuggestions,
  type EntityEditorDraft,
  type EntityEditorErrors,
  type EntityEditorField
} from '../model/entity-editor-contract';

type FieldProps = {
  draft: EntityEditorDraft;
  errors: EntityEditorErrors;
  suggestions: EntityCatalogSuggestions | undefined;
  change: (field: EntityEditorField, value: string) => void;
};

export function EntityEditorCoreFields(props: FieldProps) {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item required label={t('entity.editor.fields.type')} {...errorProps('type', props.errors, t)}>
        <Select
          aria-label={t('entity.editor.fields.type')}
          value={props.draft.type || undefined}
          options={entityTypes.map(value => ({ value, label: t(`entity.editor.types.${value}`) }))}
          onChange={value => {
            if (value) props.change('type', value);
          }}
        />
      </Form.Item>
      <EditorInput field="name" required {...props} />
      <EditorInput field="displayName" {...props} />
      <SuggestionInput field="namespace" values={props.suggestions?.namespaces} {...props} />
      <SuggestionInput field="environment" values={props.suggestions?.environments} {...props} />
    </>
  );
}

export function EntityEditorAdvancedFields(props: FieldProps) {
  const { t } = useTranslation();
  return (
    <>
      <SuggestionInput field="owner" values={props.suggestions?.owners} {...props} />
      <SuggestionInput field="system" values={props.suggestions?.systems} {...props} />
      <SuggestionInput field="lifecycle" values={props.suggestions?.lifecycles} {...props} />
      <SuggestionInput field="tier" values={props.suggestions?.tiers} {...props} />
      <Form.Item label={t('entity.editor.fields.criticality')}>
        <Select
          allowClear
          aria-label={t('entity.editor.fields.criticality')}
          value={props.draft.criticality || undefined}
          options={entityCriticalities.map(value => ({ value, label: t(`entity.editor.criticalities.${value}`) }))}
          onChange={value => props.change('criticality', value ?? '')}
        />
      </Form.Item>
      <EditorInput field="runbook" {...props} />
      <EditorInput field="description" multiline {...props} />
      <EditorInput field="labels" multiline {...props} />
      <EditorInput field="tags" {...props} />
    </>
  );
}

function SuggestionInput({
  field,
  values,
  ...props
}: FieldProps & {
  field: EntityEditorField;
  values: string[] | undefined;
}) {
  const { t } = useTranslation();
  return (
    <Form.Item label={t(`entity.editor.fields.${field}`)}>
      <AutoComplete
        aria-label={t(`entity.editor.fields.${field}`)}
        value={props.draft[field]}
        options={(values ?? []).map(value => ({ value }))}
        onChange={value => props.change(field, value)}
      />
    </Form.Item>
  );
}

function EditorInput({
  field,
  required,
  multiline,
  ...props
}: FieldProps & {
  field: EntityEditorField;
  required?: boolean;
  multiline?: boolean;
}) {
  const { t } = useTranslation();
  const label = t(`entity.editor.fields.${field}`);
  const controlProps = {
    'aria-label': label,
    value: props.draft[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      props.change(field, event.target.value)
  };
  return (
    <Form.Item required={required ?? false} label={label} {...errorProps(field, props.errors, t)}>
      {multiline ? (
        <Input.TextArea rows={field === 'description' ? 3 : 2} {...controlProps} />
      ) : (
        <Input {...controlProps} />
      )}
    </Form.Item>
  );
}

function errorText(field: EntityEditorField, errors: EntityEditorErrors, t: (key: string) => string) {
  const error = errors[field];
  return error ? t(`entity.editor.validation.${field}.${error}`) : undefined;
}

function errorProps(field: EntityEditorField, errors: EntityEditorErrors, t: (key: string) => string) {
  const help = errorText(field, errors, t);
  return help ? { validateStatus: 'error' as const, help } : {};
}
