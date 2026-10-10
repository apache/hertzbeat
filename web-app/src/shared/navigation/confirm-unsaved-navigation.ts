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

import type { TFunction } from 'i18next';

type ConfirmationApi = {
  confirm: (options: { title: string; okText: string; cancelText: string; onOk: () => unknown }) => unknown;
};

export function confirmUnsavedNavigation(modal: ConfirmationApi, t: TFunction, onConfirm: () => unknown) {
  modal.confirm({
    title: t('common.unsavedChangesConfirm'),
    okText: t('common.discardChanges'),
    cancelText: t('common.cancel'),
    onOk: onConfirm
  });
}
