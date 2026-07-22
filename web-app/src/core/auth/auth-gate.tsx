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

import { Alert, Button, Skeleton } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { loginHref, sessionLockPath } from './navigation';
import { useSession } from './session-context';
import { readSessionLockMarker } from './session-lock-storage';
import { sessionFailureMessageKey } from './session-model';

export function AuthGate() {
  const { t } = useTranslation();
  const location = useLocation();
  const { failure, loading, retry, session } = useSession();

  if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;
  if (failure) {
    return (
      <Alert
        data-session-failure={failure}
        type="error"
        showIcon
        message={t(sessionFailureMessageKey(failure))}
        action={<Button onClick={retry}>{t('common.retry')}</Button>}
      />
    );
  }
  if (!session?.authenticated) {
    return <Navigate replace to={loginHref(`${location.pathname}${location.search}${location.hash}`)} />;
  }
  if (readSessionLockMarker().kind !== 'absent') return <Navigate replace to={sessionLockPath} />;
  return <Outlet />;
}
