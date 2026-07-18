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

import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from './token.module.css';

type TokenPageHeaderProps = {
  generating: boolean;
  onGenerate: () => void;
};

export function TokenPageHeader({ generating, onGenerate }: TokenPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{t('token.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('token.description')}</Typography.Text>
      </div>
      <Button type="primary" loading={generating} onClick={onGenerate}>
        {t('token.generate')}
      </Button>
    </header>
  );
}
