/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Input, Modal, Select, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AgentScheduleViewModel } from '../model/agent-schedule-view-model';
import styles from './agent-schedule-view.module.css';

export function AgentScheduleEditor({ controller }: { controller: AgentScheduleViewModel }) {
  const { t } = useTranslation();
  const editor = controller.editor;
  if (!editor) return null;
  const draft = editor.draft;
  const receiverTypes = selectedReceiverTypes(controller);
  const templates =
    receiverTypes.size === 1 ? controller.options.templates.filter(option => receiverTypes.has(option.type)) : [];
  const valid =
    draft.name.trim() && draft.instruction.trim() && draft.cronExpression.trim() && draft.receiverIds.length;
  return (
    <Modal
      open
      destroyOnHidden
      title={t(editor.mode === 'create' ? 'aiSchedules.editor.createTitle' : 'aiSchedules.editor.editTitle')}
      okText={t('aiSchedules.editor.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !valid, loading: controller.busy === 'save' }}
      onOk={() => void controller.actions.save()}
      onCancel={controller.actions.closeEditor}
    >
      <div className={styles.editor}>
        <EditorTextFields controller={controller} />
        <ScheduleField label={t('aiSchedules.editor.receivers')}>
          <Select
            mode="multiple"
            value={draft.receiverIds}
            options={controller.options.receivers.map(option => ({ value: option.id, label: option.name }))}
            onChange={receiverIds => updateReceivers(controller, receiverIds)}
          />
        </ScheduleField>
        <ScheduleField label={t('aiSchedules.editor.template')} hint={t('aiSchedules.editor.templateHint')}>
          <Select
            allowClear
            value={draft.templateId ?? undefined}
            disabled={receiverTypes.size !== 1}
            placeholder={t('aiSchedules.editor.defaultTemplate')}
            options={templates.map(option => ({ value: option.id, label: option.name }))}
            onChange={templateId => controller.actions.updateDraft({ templateId: templateId ?? null })}
          />
        </ScheduleField>
        {editor.mode === 'create' ? <EnabledField controller={controller} /> : null}
      </div>
    </Modal>
  );
}

function EditorTextFields({ controller }: { controller: AgentScheduleViewModel }) {
  const { t } = useTranslation();
  const draft = controller.editor!.draft;
  return (
    <>
      <ScheduleField label={t('aiSchedules.editor.name')}>
        <Input
          value={draft.name}
          maxLength={128}
          onChange={event => controller.actions.updateDraft({ name: event.target.value })}
        />
      </ScheduleField>
      <ScheduleField label={t('aiSchedules.editor.instruction')}>
        <Input.TextArea
          value={draft.instruction}
          rows={5}
          maxLength={4096}
          onChange={event => controller.actions.updateDraft({ instruction: event.target.value })}
        />
      </ScheduleField>
      <ScheduleField label={t('aiSchedules.editor.cron')} hint={t('aiSchedules.editor.cronHint')}>
        <Input
          value={draft.cronExpression}
          maxLength={64}
          onChange={event => controller.actions.updateDraft({ cronExpression: event.target.value })}
        />
      </ScheduleField>
    </>
  );
}

function EnabledField({ controller }: { controller: AgentScheduleViewModel }) {
  const { t } = useTranslation();
  return (
    <div className={styles.fieldHeader}>
      <Typography.Text>{t('aiSchedules.editor.enabled')}</Typography.Text>
      <Switch
        checked={controller.editor!.draft.enabled}
        onChange={enabled => controller.actions.updateDraft({ enabled })}
      />
    </div>
  );
}

function ScheduleField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldHeader}>
        <Typography.Text>{label}</Typography.Text>
        {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function selectedReceiverTypes(controller: AgentScheduleViewModel) {
  const receiverIds = controller.editor!.draft.receiverIds;
  return new Set(
    controller.options.receivers.filter(option => receiverIds.includes(option.id)).map(option => option.type)
  );
}

function updateReceivers(controller: AgentScheduleViewModel, receiverIds: number[]) {
  const selectedTypes = new Set(
    controller.options.receivers.filter(receiver => receiverIds.includes(receiver.id)).map(receiver => receiver.type)
  );
  const selectedTemplate = controller.options.templates.find(
    template => template.id === controller.editor?.draft.templateId
  );
  controller.actions.updateDraft({
    receiverIds,
    templateId:
      selectedTypes.size === 1 && selectedTemplate && selectedTypes.has(selectedTemplate.type)
        ? selectedTemplate.id
        : null
  });
}
