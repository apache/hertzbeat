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

import { Skeleton } from 'antd';
import { Navigate, createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom';

import { AuthGate } from '@/core/auth/AuthGate';
import { RouteErrorBoundary } from '@/features/errors/RouteErrorBoundary';
import { BasicLayout } from '@/layout/basic/basic-layout';

// Static route metadata is exported so architecture tests can inspect the data-router boundary.
// eslint-disable-next-line react-refresh/only-export-components
export const appRoutes: RouteObject[] = [
  {
    id: 'application',
    path: '/',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <Skeleton active paragraph={{ rows: 6 }} />,
    children: [
      { index: true, element: <Navigate replace to="/dashboard" /> },
      {
        id: 'login',
        path: '/passport/login',
        lazy: async () => {
          const { LoginPage } = await import('@/features/auth/LoginPage');
          return { Component: LoginPage };
        }
      },
      {
        id: 'status',
        path: '/status',
        lazy: async () => {
          const { PublicStatusPage } = await import('@/features/status/PublicStatusPage');
          return { Component: PublicStatusPage };
        }
      },
      {
        id: 'authenticated',
        element: <AuthGate />,
        children: [
          {
            id: 'basic-layout',
            element: <BasicLayout />,
            children: [
              {
                id: 'dashboard',
                path: '/dashboard',
                lazy: async () => {
                  const { DashboardPage } = await import('@/features/dashboard/DashboardPage');
                  return { Component: DashboardPage };
                }
              },
              {
                id: 'monitors',
                path: '/monitors',
                lazy: async () => {
                  const { MonitorListPage } = await import('@/features/monitor/MonitorListPage');
                  return { Component: MonitorListPage };
                }
              },
              {
                id: 'explore',
                path: '/explore',
                lazy: async () => {
                  const { ExplorePage } = await import('@/features/explore/explore-page');
                  return { Component: ExplorePage };
                }
              },
              {
                id: 'monitor-new',
                path: '/monitors/new',
                lazy: async () => {
                  const { MonitorEditorPage } = await import('@/features/monitor/MonitorEditorPage');
                  return { Component: () => <MonitorEditorPage mode="new" /> };
                }
              },
              {
                id: 'monitor-edit',
                path: '/monitors/:monitorId/edit',
                lazy: async () => {
                  const { MonitorEditorPage } = await import('@/features/monitor/MonitorEditorPage');
                  return { Component: () => <MonitorEditorPage mode="edit" /> };
                }
              },
              {
                id: 'monitor-detail',
                path: '/monitors/:monitorId',
                lazy: async () => {
                  const { MonitorDetailPage } = await import('@/features/monitor/MonitorDetailPage');
                  return { Component: MonitorDetailPage };
                }
              },
              {
                id: 'alerts',
                path: '/alerts',
                lazy: async () => {
                  const { AlertCenterPage } = await import('@/features/alert/AlertCenterPage');
                  return { Component: AlertCenterPage };
                }
              },
              {
                id: 'alert-rules',
                path: '/alerts/rules',
                lazy: async () => {
                  const { AlertRuleListPage } = await import('@/features/alert/AlertRuleListPage');
                  return { Component: AlertRuleListPage };
                }
              },
              {
                id: 'alert-rule-new',
                path: '/alerts/rules/new',
                lazy: async () => {
                  const { AlertRuleEditorPage } = await import('@/features/alert/AlertRuleEditorPage');
                  return { Component: () => <AlertRuleEditorPage mode="new" /> };
                }
              },
              {
                id: 'alert-rule-edit',
                path: '/alerts/rules/:ruleId/edit',
                lazy: async () => {
                  const { AlertRuleEditorPage } = await import('@/features/alert/AlertRuleEditorPage');
                  return { Component: () => <AlertRuleEditorPage mode="edit" /> };
                }
              },
              {
                id: 'alert-groups',
                path: '/alerts/groups',
                lazy: async () => {
                  const { AlertGroupPage } = await import('@/features/alert/AlertGroupPage');
                  return { Component: AlertGroupPage };
                }
              },
              {
                id: 'alert-inhibits',
                path: '/alerts/inhibits',
                lazy: async () => {
                  const { AlertInhibitPage } = await import('@/features/alert/AlertInhibitPage');
                  return { Component: AlertInhibitPage };
                }
              },
              {
                id: 'alert-silences',
                path: '/alerts/silences',
                lazy: async () => {
                  const { AlertSilencePage } = await import('@/features/alert/AlertSilencePage');
                  return { Component: AlertSilencePage };
                }
              },
              {
                id: 'notice-receivers',
                path: '/alerts/notifications/receivers',
                lazy: async () => {
                  const { NoticeReceiverPage } = await import('@/features/alert/NoticeReceiverPage');
                  return { Component: NoticeReceiverPage };
                }
              },
              {
                id: 'notice-templates',
                path: '/alerts/notifications/templates',
                lazy: async () => {
                  const { NoticeTemplatePage } = await import('@/features/alert/NoticeTemplatePage');
                  return { Component: NoticeTemplatePage };
                }
              },
              {
                id: 'notice-rules',
                path: '/alerts/notifications/rules',
                lazy: async () => {
                  const { NoticeRulePage } = await import('@/features/alert/NoticeRulePage');
                  return { Component: NoticeRulePage };
                }
              },
              {
                id: 'message-server',
                path: '/setting/settings/server',
                lazy: async () => {
                  const { MessageServerPage } = await import('@/features/settings/MessageServerPage');
                  return { Component: MessageServerPage };
                }
              },
              {
                id: 'bulletin',
                path: '/bulletin',
                lazy: async () => {
                  const { BulletinPage } = await import('@/features/bulletin/BulletinPage');
                  return { Component: BulletinPage };
                }
              },
              {
                id: 'not-found',
                path: '*',
                lazy: async () => {
                  const { NotFoundPage } = await import('@/features/errors/NotFoundPage');
                  return { Component: NotFoundPage };
                }
              }
            ]
          }
        ]
      }
    ]
  }
];

const router = createBrowserRouter(appRoutes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
