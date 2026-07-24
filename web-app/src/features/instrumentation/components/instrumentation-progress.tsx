/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Button, Steps } from 'antd';
import { useTranslation } from 'react-i18next';

import { INSTRUMENTATION_STAGES, type InstrumentationStage } from '../model/instrumentation-flow';
import styles from './instrumentation-shell.module.css';

export function InstrumentationProgress(props: { stage: InstrumentationStage; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className={styles.progress}>
      <Steps
        size="small"
        current={INSTRUMENTATION_STAGES.indexOf(props.stage)}
        items={INSTRUMENTATION_STAGES.map(stage => ({ title: t(`instrumentation.v2.stage.${stage}`) }))}
      />
      {props.stage !== 'source' && <Button onClick={props.onBack}>{t('common.back')}</Button>}
    </div>
  );
}
