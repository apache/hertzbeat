/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Form } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  OperationalFormActions,
  OperationalPage,
  OperationalPageHeader,
  OperationalSection,
  OperationalStatePanel
} from '@/shared/operational-page';

import type {
  EntityCatalogSuggestions,
  EntityEditorDraft,
  EntityEditorErrors,
  EntityEditorField
} from '../model/entity-editor-contract';
import { EntityEditorAdvancedFields, EntityEditorCoreFields } from './entity-editor-fields';
import styles from './entity-view.module.css';

type EditorEvidence = { kind: 'loading' | 'missing' | 'permission' | 'unavailable' | 'error' } | { kind: 'ready' };
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
  if (state.evidence.kind !== 'ready') {
    const stateCopy = {
      loading: { kind: 'loading', title: t('entity.loading') },
      missing: { kind: 'empty', title: t('common.notFound.description') },
      permission: { kind: 'permission', title: t('entity.editor.saveFailure.permission') },
      unavailable: { kind: 'unavailable', title: t('common.unavailable') },
      error: { kind: 'error', title: t('common.routeError.description') }
    } as const;
    return (
      <OperationalPage mode="form">
        <OperationalPageHeader
          title={t(state.mode === 'new' ? 'entity.editor.addTitle' : 'entity.editor.editTitle')}
          description={t('entity.editor.identityHint')}
        />
        <OperationalStatePanel {...stateCopy[state.evidence.kind]} />
      </OperationalPage>
    );
  }
  return <ReadyEditor state={state} actions={actions} />;
}

function ReadyEditor({ state, actions }: EntityEditorViewProps) {
  const { t } = useTranslation();
  const [advanced, setAdvanced] = useState(false);
  const suggestions = state.suggestions.kind === 'ready' ? state.suggestions.value : undefined;
  const fields = { draft: state.draft, errors: state.errors, suggestions, change: actions.change };
  return (
    <OperationalPage mode="form">
      <OperationalPageHeader
        title={t(state.mode === 'new' ? 'entity.editor.addTitle' : 'entity.editor.editTitle')}
        description={t('entity.editor.identityHint')}
      />
      {state.suggestions.kind === 'unavailable' ? (
        <Alert showIcon type="info" message={t('entity.editor.suggestionsUnavailable')} />
      ) : null}
      {state.saveFailure ? (
        <Alert showIcon type="error" message={t(`entity.editor.saveFailure.${state.saveFailure}`)} />
      ) : null}
      <Form disabled={state.saving} layout="vertical" onFinish={actions.submit} className={styles.editorForm}>
        <OperationalSection title={t('entity.sections.details')}>
          <div className={styles.editorFields}>
            <EntityEditorCoreFields {...fields} />
          </div>
        </OperationalSection>
        <div className={styles.disclosureRow}>
          <Button type="text" onClick={() => setAdvanced(value => !value)}>
            {t(advanced ? 'entity.editor.hideAdvanced' : 'entity.editor.showAdvanced')}
          </Button>
        </div>
        {advanced ? (
          <OperationalSection title={t('entity.editor.showAdvanced')}>
            <div className={styles.editorFields}>
              <EntityEditorAdvancedFields {...fields} />
            </div>
          </OperationalSection>
        ) : null}
        <OperationalFormActions>
          <Button type="primary" htmlType="submit" loading={state.saving}>
            {t('common.save')}
          </Button>
          <Button disabled={state.saving} onClick={() => actions.cancel()}>
            {t('common.cancel')}
          </Button>
        </OperationalFormActions>
      </Form>
    </OperationalPage>
  );
}
