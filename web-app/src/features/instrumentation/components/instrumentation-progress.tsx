/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
