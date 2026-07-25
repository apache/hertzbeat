/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Empty, Form, Space, Spin, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  EntityCatalogSuggestions,
  EntityEditorDraft,
  EntityEditorErrors,
  EntityEditorField
} from '../model/entity-editor-contract';
import { EntityEditorAdvancedFields, EntityEditorCoreFields } from './entity-editor-fields';
import styles from './entity-view.module.css';

type EditorEvidence = { kind: 'loading' | 'missing' | 'unavailable' | 'error' } | { kind: 'ready' };
type SuggestionEvidence =
  { kind: 'loading' | 'unavailable' } | { kind: 'ready'; value: EntityCatalogSuggestions | undefined };
type SaveFailure = 'permission' | 'validation' | 'unavailable' | 'error';

export type EntityEditorViewProps = {
  state: {
    mode: 'new' | 'edit';
    evidence: EditorEvidence;
    suggestions: SuggestionEvidence;
    draft: EntityEditorDraft;
    dirty: boolean;
    errors: EntityEditorErrors;
    saving: boolean;
    saveFailure?: SaveFailure;
  };
  actions: {
    change: (field: EntityEditorField, value: string) => void;
    submit: () => void;
    cancel: () => void;
  };
};

export function EntityEditorView({ state, actions }: EntityEditorViewProps) {
  const { t } = useTranslation();
  if (state.evidence.kind === 'loading')
    return (
      <div role="status">
        <Spin />
      </div>
    );
  if (state.evidence.kind === 'missing') return <Empty description={t('common.notFound.description')} />;
  if (state.evidence.kind === 'unavailable') return <Alert type="warning" message={t('common.unavailable')} />;
  if (state.evidence.kind === 'error') return <Alert type="error" message={t('common.routeError.description')} />;
  return <ReadyEditor state={state} actions={actions} />;
}

function ReadyEditor({ state, actions }: EntityEditorViewProps) {
  const { t } = useTranslation();
  const [advanced, setAdvanced] = useState(false);
  const suggestions = state.suggestions.kind === 'ready' ? state.suggestions.value : undefined;
  const fields = { draft: state.draft, errors: state.errors, suggestions, change: actions.change };
  return (
    <div className={styles.editorPage ?? ''}>
      <header>
        <Typography.Title level={2}>
          {t(state.mode === 'new' ? 'entity.editor.addTitle' : 'entity.editor.editTitle')}
        </Typography.Title>
        <Typography.Text type="secondary">{t('entity.editor.identityHint')}</Typography.Text>
      </header>
      {state.suggestions.kind === 'unavailable' ? (
        <Alert showIcon type="info" message={t('entity.editor.suggestionsUnavailable')} />
      ) : null}
      {state.saveFailure ? (
        <Alert showIcon type="error" message={t(`entity.editor.saveFailure.${state.saveFailure}`)} />
      ) : null}
      <Form disabled={state.saving} layout="vertical" onFinish={actions.submit} className={styles.editorForm ?? ''}>
        <EntityEditorCoreFields {...fields} />
        <Button type="link" className={styles.disclosure ?? ''} onClick={() => setAdvanced(value => !value)}>
          {t(advanced ? 'entity.editor.hideAdvanced' : 'entity.editor.showAdvanced')}
        </Button>
        {advanced ? <EntityEditorAdvancedFields {...fields} /> : null}
        <Space>
          <Button type="primary" htmlType="submit" loading={state.saving}>
            {t('common.save')}
          </Button>
          <Button disabled={state.saving} onClick={() => actions.cancel()}>
            {t('common.cancel')}
          </Button>
        </Space>
      </Form>
    </div>
  );
}
