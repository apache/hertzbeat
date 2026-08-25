/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Badge, Button, Input } from 'antd';
import type { ComponentRef, DragEvent } from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { logAlertFields, type AlertRuleDraft, type MetricAlertField } from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';

const metricVariables = [
  '__instance__',
  '__labels__',
  '__instancename__',
  '__instancehost__',
  '__app__',
  '__metrics__'
] as const;

const templateDragType = 'text/plain';
const templateMaxLength = 200;

export function AlertRuleTemplateField(props: {
  draft: AlertRuleDraft;
  busy: boolean;
  invalid: boolean;
  metricFields: MetricAlertField[];
  update: (patch: Partial<AlertRuleDraft>) => void;
}) {
  const { t } = useTranslation();
  const textareaRef = useRef<ComponentRef<typeof Input.TextArea> | null>(null);
  const dragSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const variables =
    props.draft.kind === 'realtime' && props.draft.dataType === 'log'
      ? logAlertFields.map(field => ({ value: field.value, label: field.label }))
      : [
          ...metricVariables.map(value => ({ value, label: t(`alertRules.variables.${value}`) })),
          ...props.metricFields.map(field => ({ value: field.value, label: field.label }))
        ];
  return (
    <div className={styles.templateEditor}>
      {props.draft.kind === 'realtime' && (
        <div className={styles.variableList} aria-label={t('alertRules.variables.title')}>
          {variables.map((variable, index) => {
            const token = `\${${variable.value}}`;
            return (
              <Button
                className={styles.variableButton ?? ''}
                disabled={props.busy}
                draggable={!props.busy}
                key={`${variable.value}:${index}`}
                onClick={() => {
                  const nextTemplate = insertTemplateToken(
                    props.draft.template,
                    token,
                    props.draft.template.length,
                    props.draft.template.length
                  );
                  if (nextTemplate !== null) props.update({ template: nextTemplate });
                }}
                onDragEnd={event => setDragClass(event, false)}
                onDragStart={event => {
                  const textarea = textareaRef.current?.resizableTextArea?.textArea;
                  dragSelectionRef.current = textarea
                    ? { start: textarea.selectionStart, end: textarea.selectionEnd }
                    : null;
                  event.dataTransfer.effectAllowed = 'copy';
                  event.dataTransfer.setData(templateDragType, token);
                  setDragClass(event, true);
                }}
              >
                <span className={styles.variableTokenLine}>
                  <Badge status="success" />
                  <code>{token}</code>
                </span>
                <small>{variable.label}</small>
              </Button>
            );
          })}
        </div>
      )}
      <Input.TextArea
        ref={textareaRef}
        aria-invalid={props.invalid}
        aria-label={t('alertRules.template')}
        className={styles.templateDropTarget ?? ''}
        disabled={props.busy}
        maxLength={templateMaxLength}
        placeholder={t('alertRules.templatePlaceholder')}
        required
        rows={3}
        showCount={{ formatter: ({ count, maxLength }) => `${count}/${maxLength}` }}
        value={props.draft.template}
        onChange={event => props.update({ template: event.target.value })}
        onDragLeave={event => setDropClass(event, false)}
        onDragOver={event => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDropClass(event, true);
        }}
        onDrop={event => {
          event.preventDefault();
          setDropClass(event, false);
          if (props.busy) return;
          const token = event.dataTransfer.getData(templateDragType);
          if (!token) return;
          const textarea = event.currentTarget;
          const selection = dragSelectionRef.current;
          dragSelectionRef.current = null;
          const start = selection?.start ?? textarea.selectionStart;
          const end = selection?.end ?? textarea.selectionEnd;
          const nextTemplate = insertTemplateToken(textarea.value, token, start, end);
          if (nextTemplate === null) return;
          const nextSelection = start + token.length;
          textarea.value = nextTemplate;
          textarea.setSelectionRange(nextSelection, nextSelection);
          props.update({ template: nextTemplate });
        }}
      />
    </div>
  );
}

function insertTemplateToken(template: string, token: string, start: number, end: number) {
  const nextTemplate = `${template.slice(0, start)}${token}${template.slice(end)}`;
  return nextTemplate.length <= templateMaxLength ? nextTemplate : null;
}

function setDragClass(event: DragEvent<HTMLElement>, active: boolean) {
  const className = styles.variableDragging;
  if (!className) return;
  event.currentTarget.classList.toggle(className, active);
}

function setDropClass(event: DragEvent<HTMLTextAreaElement>, active: boolean) {
  const className = styles.templateDropTargetActive;
  if (!className) return;
  event.currentTarget.classList.toggle(className, active);
}
