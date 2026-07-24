/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Radio, Select, Space, Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import {
  APPLICATION_QUESTIONS,
  applicationQuestionOptions,
  type ApplicationQuestion,
  type InstrumentationDraft
} from '../model/instrumentation-flow';
import { SOURCE_KINDS, type CatalogResponse, type Recipe, type SourceKind } from '../model/instrumentation-v2-contract';
import { translateBackend } from './instrumentation-i18n';
import styles from './instrumentation-shell.module.css';

export function InstrumentationSourceStep(props: {
  catalog: CatalogResponse;
  sourceKind: SourceKind;
  recipeId?: string;
  language?: string;
  framework?: string;
  method?: string;
  environment?: string;
  platform?: string;
  onSource: (kind: SourceKind) => void;
  onApplicationAnswer: (field: ApplicationQuestion, value: string) => void;
}) {
  const { t } = useTranslation();
  const draft: InstrumentationDraft = {
    sourceKind: props.sourceKind,
    intakeProfileId: '',
    service: { name: '', namespace: '', environment: '' },
    ...(props.recipeId ? { recipeId: props.recipeId } : {}),
    ...(props.language ? { language: props.language } : {}),
    ...(props.framework ? { framework: props.framework } : {}),
    ...(props.method ? { method: props.method } : {}),
    ...(props.environment ? { environment: props.environment } : {}),
    ...(props.platform ? { platform: props.platform } : {})
  };
  return (
    <section className={styles.section} aria-labelledby="instrumentation-source-title">
      <Typography.Title id="instrumentation-source-title" level={4}>
        {t('instrumentation.v2.connectTitle')}
      </Typography.Title>
      <Radio.Group
        className={styles.sourceList!}
        value={props.sourceKind}
        onChange={event => {
          const kind: unknown = event.target.value;
          if (SOURCE_KINDS.includes(kind as SourceKind)) props.onSource(kind as SourceKind);
        }}
      >
        {props.catalog.sources.map(source => (
          <Radio key={source.kind} value={source.kind} className={styles.sourceRow!}>
            <span>
              <strong>{translateBackend(t, source.labelKey)}</strong>
              <Typography.Text type="secondary">{translateBackend(t, source.descriptionKey)}</Typography.Text>
            </span>
          </Radio>
        ))}
      </Radio.Group>
      {props.sourceKind === 'application' && <ApplicationQuestions {...props} draft={draft} />}
    </section>
  );
}

function ApplicationQuestions(
  props: Parameters<typeof InstrumentationSourceStep>[0] & {
    draft: InstrumentationDraft;
  }
) {
  const { t } = useTranslation();
  const selectedRecipe = props.catalog.recipes.find(recipe => recipe.id === props.recipeId);
  const firstUnanswered = APPLICATION_QUESTIONS.findIndex(field => !props[field]);
  const visibleQuestions =
    firstUnanswered < 0 ? APPLICATION_QUESTIONS : APPLICATION_QUESTIONS.slice(0, firstUnanswered + 1);
  return (
    <Space direction="vertical" className={styles.fullWidth!}>
      {visibleQuestions.map(field => (
        <label key={field}>
          <Typography.Text strong>
            {t(`instrumentation.field.${field === 'environment' ? 'deploymentEnvironment' : field}`)}
          </Typography.Text>
          <Select
            value={props[field] ?? null}
            options={applicationQuestionOptions(props.catalog, props.draft, field).map(value => ({
              value,
              label: t(`instrumentation.${field}.${value}`, { defaultValue: value })
            }))}
            onChange={value => props.onApplicationAnswer(field, value)}
          />
        </label>
      ))}
      {selectedRecipe && (
        <Typography.Text type="secondary">
          {translateRecipe(t, selectedRecipe)}
          {selectedRecipe.preview && <Tag color="warning">{t('instrumentation.preview')}</Tag>}
        </Typography.Text>
      )}
    </Space>
  );
}

function translateRecipe(t: TFunction, recipe: Recipe) {
  const fallback = (['language', 'framework', 'method'] as const)
    .flatMap(field => (recipe[field] ? [[field, recipe[field]]] : []))
    .map(([field, value]) => t(`instrumentation.${field}.${value}`, { defaultValue: value }))
    .join(' · ');
  return t(recipe.labelKey, { defaultValue: fallback });
}
