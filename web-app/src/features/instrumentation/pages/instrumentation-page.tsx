/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { InstrumentationRunbook } from '../components/instrumentation-runbook';
import styles from '../components/instrumentation-shell.module.css';
import { useInstrumentationPageController } from '../controller/use-instrumentation-page-controller';

export function InstrumentationPage() {
  const { t } = useTranslation();
  const { setup, detection } = useInstrumentationPageController();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('instrumentation.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('instrumentation.description')}</Typography.Text>
        </div>
        <Typography.Text type="secondary">
          {t('instrumentation.schemaVersion', { version: setup.schemaVersion })}
        </Typography.Text>
      </header>
      <InstrumentationRunbook setup={setup} detection={detection} />
    </div>
  );
}
