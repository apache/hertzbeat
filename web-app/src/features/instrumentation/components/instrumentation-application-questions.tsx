/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { CheckOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
  APPLICATION_QUESTIONS,
  applicationQuestionOptions,
  type ApplicationQuestion,
  type InstrumentationDraft
} from '../model/instrumentation-flow';
import type { CatalogResponse, Recipe } from '../model/instrumentation-v2-contract';
import styles from './instrumentation-shell.module.css';
import { InstrumentationChoiceIcon } from './instrumentation-source-icon';

export function InstrumentationApplicationQuestions(props: {
  catalog: CatalogResponse;
  draft: InstrumentationDraft;
  onAnswer: (field: ApplicationQuestion, value: string) => void;
}) {
  const { t } = useTranslation();
  const questions = visibleQuestions(props.catalog, props.draft);
  const selectedRecipe = props.catalog.recipes.find(recipe => recipe.id === props.draft.recipeId);
  const focusQuestion = questions.find(({ field }) => !props.draft[field]) ?? questions.at(-1);
  const focusQuestionField = focusQuestion?.field;
  const sectionRef = useRef<HTMLElement>(null);

  // Keep progressive questions discoverable below a long source catalog, as the
  // user otherwise sees only the selected tile and has no visible next action.
  useEffect(() => {
    if (focusQuestionField) sectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [focusQuestionField, props.draft.sourceId]);

  return (
    <section ref={sectionRef} className={styles.questionSection}>
      {questions.map(({ field, options }) => (
        <div key={field} className={styles.questionGroup}>
          <Typography.Title level={3}>{questionLabel(t, field)}</Typography.Title>
          <div className={styles.questionGrid}>
            {options.map(value => {
              const selected = props.draft[field] === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  className={`${styles.questionTile} ${selected ? styles.questionTileSelected : ''}`}
                  onClick={() => props.onAnswer(field, value)}
                >
                  <span className={styles.questionChoice}>
                    <InstrumentationChoiceIcon value={value} />
                    <span>{t(`instrumentation.${field}.${value}`, { defaultValue: value })}</span>
                  </span>
                  {selected && <CheckOutlined aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {selectedRecipe && (
        <Typography.Text type="secondary">
          {translateRecipe(t, selectedRecipe)}
          {selectedRecipe.preview && <Tag color="warning">{t('instrumentation.preview')}</Tag>}
        </Typography.Text>
      )}
    </section>
  );
}

function visibleQuestions(catalog: CatalogResponse, draft: InstrumentationDraft) {
  let lastChoice: { field: ApplicationQuestion; options: string[] } | undefined;
  for (const field of APPLICATION_QUESTIONS) {
    const options = applicationQuestionOptions(catalog, draft, field);
    if (!options.length) break;
    if (options.length <= 1) continue;
    lastChoice = { field, options };
    if (!draft[field]) return [lastChoice];
  }
  return lastChoice ? [lastChoice] : [];
}

function questionLabel(t: TFunction, question: ApplicationQuestion) {
  return t(`instrumentation.question.${question}`);
}

function translateRecipe(t: TFunction, recipe: Recipe) {
  const fallback = (['language', 'framework', 'method'] as const)
    .flatMap(field => (recipe[field] ? [[field, recipe[field]]] : []))
    .map(([field, value]) => t(`instrumentation.${field}.${value}`, { defaultValue: value }))
    .join(' · ');
  return t(recipe.labelKey, { defaultValue: fallback });
}
