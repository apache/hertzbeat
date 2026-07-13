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

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from 'antd';

import { AuthGate } from '@/core/auth/AuthGate';
import { NotFoundPage } from '@/features/errors';
import { BasicLayout } from '@/layout/basic/BasicLayout';

const LoginPage = lazy(() => import('@/features/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const BulletinPage = lazy(() => import('@/features/bulletin/BulletinPage').then(module => ({ default: module.BulletinPage })));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then(module => ({ default: module.DashboardPage })));
const PublicStatusPage = lazy(() => import('@/features/status/PublicStatusPage').then(module => ({ default: module.PublicStatusPage })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
        <Routes>
          <Route path="/passport/login" element={<LoginPage />} />
          <Route path="/status" element={<PublicStatusPage />} />
          <Route element={<AuthGate />}>
            <Route element={<BasicLayout />}>
              <Route index element={<Navigate replace to="/dashboard" />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/bulletin" element={<BulletinPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
