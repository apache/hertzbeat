/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Steps } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  INSTRUMENTATION_CONFIGURE_PHASES,
  type InstrumentationConfigurePhase
} from '../model/instrumentation-guided-flow';
import type { InstrumentationStage } from '../model/instrumentation-flow';
import styles from './instrumentation-shell.module.css';

const GUIDED_STEPS = ['source', ...INSTRUMENTATION_CONFIGURE_PHASES] as const;

export function InstrumentationProgress(props: {
  stage: InstrumentationStage;
  configurePhase: InstrumentationConfigurePhase;
}) {
  const { t } = useTranslation();
  const current = props.stage === 'source' ? 0 : GUIDED_STEPS.indexOf(props.configurePhase);
  return (
    <div className={styles.guidedProgress}>
      <Steps
        size="small"
        direction="vertical"
        current={current}
        items={GUIDED_STEPS.map(step => ({ title: t(`instrumentation.v2.guided.stage.${step}`) }))}
      />
    </div>
  );
}
