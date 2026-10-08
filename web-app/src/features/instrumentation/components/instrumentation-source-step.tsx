/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  APPLICATION_QUESTIONS,
  answerApplicationQuestion,
  selectSource,
  type ApplicationQuestion
} from '../model/instrumentation-flow';
import type { CatalogResponse } from '../model/instrumentation-v2-contract';
import { InstrumentationApplicationQuestions } from './instrumentation-application-questions';
import { InstrumentationSourceDirectory } from './instrumentation-source-directory';
import { InstrumentationSourceTile } from './instrumentation-source-tile';
import styles from './instrumentation-shell.module.css';

export function InstrumentationSourceStep(props: {
  catalog: CatalogResponse;
  sourceId?: string;
  recipeId?: string;
  framework?: string;
  method?: string;
  environment?: string;
  platform?: string;
  agentlessTarget?: string;
  canCreateMonitor?: boolean;
  onSource: (sourceId: string) => void;
  onApplicationAnswer: (field: ApplicationQuestion, value: string) => void;
}) {
  const { t } = useTranslation();
  const draft = buildDraft(props);
  const selectedSource = props.catalog.sources.find(source => source.id === props.sourceId);
  return (
    <section className={styles.section} aria-label={t('instrumentation.v2.connectTitle')}>
      {!draft && (
        <>
          <div className={styles.sourceIntro}>
            <Typography.Title level={3}>{t('instrumentation.v2.connectTitle')}</Typography.Title>
            <Typography.Text type="secondary">{t('instrumentation.v2.description')}</Typography.Text>
          </div>
          <InstrumentationSourceDirectory {...props} />
        </>
      )}
      {draft?.sourceKind === 'application' && (
        <InstrumentationApplicationQuestions
          catalog={props.catalog}
          draft={draft}
          onAnswer={props.onApplicationAnswer}
        />
      )}
      {draft?.sourceKind !== 'application' && selectedSource && (
        <div className={styles.selectedSource}>
          <InstrumentationSourceTile source={selectedSource} selected onSelect={props.onSource} />
        </div>
      )}
    </section>
  );
}

function buildDraft(props: Parameters<typeof InstrumentationSourceStep>[0]) {
  if (!props.sourceId) return undefined;
  let draft = selectSource(props.catalog, props.sourceId);
  for (const field of APPLICATION_QUESTIONS) {
    const value = props[field];
    if (value && draft[field] !== value) draft = answerApplicationQuestion(draft, props.catalog, field, value);
  }
  return draft;
}
