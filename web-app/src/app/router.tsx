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
import { Navigate, createBrowserRouter, RouterProvider, useLocation, type RouteObject } from 'react-router-dom';

import { AuthGate } from '@/core/auth/auth-gate';
import { RouteErrorBoundary } from '@/features/errors/route-error-boundary';
import { BasicLayout } from '@/layout/basic/basic-layout';
import { legacySettingsPaths, settingsPaths } from '@/shared/settings/settings-routes';

import { RefineRuntime } from './refine/refine-runtime';

function LegacySettingsRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate replace to={`${to}${location.search}${location.hash}`} />;
}

// Static route metadata is exported so architecture tests can inspect the data-router boundary.
// eslint-disable-next-line react-refresh/only-export-components
export const appRoutes: RouteObject[] = [
  {
    id: 'application',
    path: '/',
    element: <RefineRuntime />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <Skeleton active paragraph={{ rows: 6 }} />,
    children: [
      { index: true, element: <Navigate replace to="/dashboard" /> },
      {
        id: 'login',
        path: '/passport/login',
        lazy: async () => {
          const { LoginPage } = await import('@/features/auth/login-page');
          return { Component: LoginPage };
        }
      },
      {
        id: 'status',
        path: '/status',
        lazy: async () => {
          const { PublicStatusPage } = await import('@/features/status');
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
                  const { DashboardPage } = await import('@/features/dashboard');
                  return { Component: DashboardPage };
                }
              },
              {
                id: 'monitors',
                path: '/monitors',
                lazy: async () => {
                  const { MonitorListPage } = await import('@/features/monitor');
                  return { Component: MonitorListPage };
                }
              },
              {
                id: 'explore',
                path: '/explore',
                lazy: async () => {
                  const { ExplorePage } = await import('@/features/explore');
                  return { Component: ExplorePage };
                }
              },
              {
                id: 'instrumentation',
                path: '/observability/integration',
                lazy: async () => {
                  const { InstrumentationPage } = await import('@/features/instrumentation');
                  return { Component: InstrumentationPage };
                }
              },
              {
                id: 'monitor-new',
                path: '/monitors/new',
                lazy: async () => {
                  const { MonitorEditorPage } = await import('@/features/monitor');
                  return { Component: () => <MonitorEditorPage mode="new" /> };
                }
              },
              {
                id: 'monitor-edit',
                path: '/monitors/:monitorId/edit',
                lazy: async () => {
                  const { MonitorEditorPage } = await import('@/features/monitor');
                  return { Component: () => <MonitorEditorPage mode="edit" /> };
                }
              },
              {
                id: 'monitor-detail',
                path: '/monitors/:monitorId',
                lazy: async () => {
                  const { MonitorDetailPage } = await import('@/features/monitor');
                  return { Component: MonitorDetailPage };
                }
              },
              {
                id: 'alerts',
                path: '/alerts',
                lazy: async () => {
                  const { AlertCenterPage } = await import('@/features/alert/alert-center-page');
                  return { Component: AlertCenterPage };
                }
              },
              {
                id: 'alert-rules',
                path: '/alerts/rules',
                lazy: async () => {
                  const { AlertRuleListPage } = await import('@/features/alert/alert-rule-list-page');
                  return { Component: AlertRuleListPage };
                }
              },
              {
                id: 'alert-rule-new',
                path: '/alerts/rules/new',
                lazy: async () => {
                  const { AlertRuleEditorPage } = await import('@/features/alert/alert-rule-editor-page');
                  return { Component: () => <AlertRuleEditorPage mode="new" /> };
                }
              },
              {
                id: 'alert-rule-edit',
                path: '/alerts/rules/:ruleId/edit',
                lazy: async () => {
                  const { AlertRuleEditorPage } = await import('@/features/alert/alert-rule-editor-page');
                  return { Component: () => <AlertRuleEditorPage mode="edit" /> };
                }
              },
              {
                id: 'alert-groups',
                path: '/alerts/groups',
                lazy: async () => {
                  const { AlertGroupPage } = await import('@/features/alert/alert-group-page');
                  return { Component: AlertGroupPage };
                }
              },
              {
                id: 'alert-inhibits',
                path: '/alerts/inhibits',
                lazy: async () => {
                  const { AlertInhibitPage } = await import('@/features/alert/alert-inhibit-page');
                  return { Component: AlertInhibitPage };
                }
              },
              {
                id: 'alert-silences',
                path: '/alerts/silences',
                lazy: async () => {
                  const { AlertSilencePage } = await import('@/features/alert/alert-silence-page');
                  return { Component: AlertSilencePage };
                }
              },
              {
                id: 'notice-receivers',
                path: settingsPaths.receivers,
                lazy: async () => {
                  const { NoticeReceiverPage } = await import('@/features/alert/notice-receiver');
                  return { Component: NoticeReceiverPage };
                }
              },
              {
                id: 'notice-templates',
                path: settingsPaths.templates,
                lazy: async () => {
                  const { NoticeTemplatePage } = await import('@/features/alert/notice-template-page');
                  return { Component: NoticeTemplatePage };
                }
              },
              {
                id: 'notice-rules',
                path: settingsPaths.rules,
                lazy: async () => {
                  const { NoticeRulePage } = await import('@/features/alert/notice-rule');
                  return { Component: NoticeRulePage };
                }
              },
              {
                id: 'message-server',
                path: settingsPaths.channels,
                lazy: async () => {
                  const { MessageServerPage } = await import('@/features/settings/message-server');
                  return { Component: MessageServerPage };
                }
              },
              {
                id: 'tokens',
                path: settingsPaths.tokens,
                lazy: async () => {
                  const { TokenPage } = await import('@/features/settings/token');
                  return { Component: TokenPage };
                }
              },
              {
                id: 'system-settings',
                path: settingsPaths.system,
                lazy: async () => {
                  const { SystemConfigPage } = await import('@/features/settings/system-config');
                  return { Component: SystemConfigPage };
                }
              },
              {
                id: 'labels',
                path: settingsPaths.labels,
                lazy: async () => {
                  const { LabelPage } = await import('@/features/settings/label');
                  return { Component: LabelPage };
                }
              },
              {
                id: 'object-store',
                path: settingsPaths.objectStore,
                lazy: async () => {
                  const { ObjectStorePage } = await import('@/features/settings/object-store');
                  return { Component: ObjectStorePage };
                }
              },
              {
                id: 'status-management',
                path: settingsPaths.statusPage,
                lazy: async () => {
                  const { StatusManagementPage } = await import('@/features/status');
                  return { Component: StatusManagementPage };
                }
              },
              {
                id: 'settings',
                path: settingsPaths.root,
                element: <Navigate replace to={settingsPaths.receivers} />
              },
              {
                id: 'legacy-notice-receivers',
                path: legacySettingsPaths.receivers,
                element: <LegacySettingsRedirect to={settingsPaths.receivers} />
              },
              {
                id: 'legacy-notice-templates',
                path: legacySettingsPaths.templates,
                element: <LegacySettingsRedirect to={settingsPaths.templates} />
              },
              {
                id: 'legacy-notice-rules',
                path: legacySettingsPaths.rules,
                element: <LegacySettingsRedirect to={settingsPaths.rules} />
              },
              {
                id: 'legacy-message-server',
                path: legacySettingsPaths.channels,
                element: <LegacySettingsRedirect to={settingsPaths.channels} />
              },
              {
                id: 'legacy-system-settings',
                path: legacySettingsPaths.system,
                element: <LegacySettingsRedirect to={settingsPaths.system} />
              },
              {
                id: 'legacy-labels',
                path: legacySettingsPaths.labels,
                element: <LegacySettingsRedirect to={settingsPaths.labels} />
              },
              {
                id: 'legacy-object-store',
                path: legacySettingsPaths.objectStore,
                element: <LegacySettingsRedirect to={settingsPaths.objectStore} />
              },
              {
                id: 'legacy-status-management',
                path: legacySettingsPaths.statusPage,
                element: <LegacySettingsRedirect to={settingsPaths.statusPage} />
              },
              {
                id: 'bulletin',
                path: '/bulletin',
                lazy: async () => {
                  const { BulletinPage } = await import('@/features/bulletin');
                  return { Component: BulletinPage };
                }
              },
              {
                id: 'not-found',
                path: '*',
                lazy: async () => {
                  const { NotFoundPage } = await import('@/features/errors/not-found-page');
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
