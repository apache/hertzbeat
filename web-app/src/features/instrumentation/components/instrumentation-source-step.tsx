/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Radio, Select, Space, Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { recipeDimensions } from '../model/instrumentation-flow';
import type { CatalogResponse, Recipe, SourceKind } from '../model/instrumentation-v2-contract';
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
  onRecipe: (recipe: Recipe) => void;
}) {
  const { t } = useTranslation();
  const recipes = props.catalog.recipes.filter(recipe => recipe.kind === props.sourceKind);
  const dimensions = recipeDimensions(recipes);
  return (
    <section className={styles.section} aria-labelledby="instrumentation-source-title">
      <Typography.Title id="instrumentation-source-title" level={4}>
        {t('instrumentation.v2.connectTitle')}
      </Typography.Title>
      <Radio.Group
        className={styles.sourceList!}
        value={props.sourceKind}
        onChange={event => props.onSource(event.target.value)}
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
      {props.sourceKind === 'application' && (
        <Space direction="vertical" className={styles.fullWidth!}>
          <Typography.Text strong>{t('instrumentation.v2.recipeLabel')}</Typography.Text>
          <Select
            value={props.recipeId ?? null}
            placeholder={t('instrumentation.v2.chooseRecipe')}
            options={recipes.map(recipe => ({
              value: recipe.id,
              label: (
                <span>
                  {translateBackend(t, recipe.labelKey)}{' '}
                  {recipe.preview && <Tag color="warning">{t('instrumentation.preview')}</Tag>}
                </span>
              )
            }))}
            onChange={id => {
              const recipe = recipes.find(item => item.id === id);
              if (recipe) props.onRecipe(recipe);
            }}
          />
          {(
            [
              ['language', dimensions.languages],
              ['framework', dimensions.frameworks],
              ['method', dimensions.methods],
              ['environment', dimensions.environments],
              ['platform', dimensions.platforms]
            ] as const
          ).map(([field, values]) => (
            <label key={field}>
              <Typography.Text strong>
                {t(`instrumentation.field.${field === 'environment' ? 'deploymentEnvironment' : field}`)}
              </Typography.Text>
              <Select
                value={props[field] ?? null}
                options={values.map(value => ({
                  value,
                  label: t(`instrumentation.${field}.${value}`, { defaultValue: value })
                }))}
                onChange={value => {
                  const recipe = recipes.find(item =>
                    field === 'environment' || field === 'platform'
                      ? item[`${field}s`].includes(value)
                      : item[field] === value
                  );
                  if (recipe) props.onRecipe(recipe);
                }}
              />
            </label>
          ))}
        </Space>
      )}
    </section>
  );
}

export function translateBackend(t: TFunction, key: string) {
  return t(key, { defaultValue: t('instrumentation.v2.unknownGuidance') });
}
