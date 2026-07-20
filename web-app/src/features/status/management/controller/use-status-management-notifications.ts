/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useTranslation } from 'react-i18next';

export type StatusManagementNotifications = {
  saveSuccess: () => void;
  saveFailed: () => void;
  writeUnverified: () => void;
  deleteSuccess: () => void;
  deleteFailed: () => void;
};

export function useStatusManagementNotifications(): StatusManagementNotifications {
  const { t } = useTranslation();
  const { message } = App.useApp();
  return {
    saveSuccess: () => void message.success(t('statusManagement.saveSuccess')),
    saveFailed: () => void message.error(t('statusManagement.saveFailed')),
    writeUnverified: () => void message.warning(t('statusManagement.unknown')),
    deleteSuccess: () => void message.success(t('statusManagement.deleteSuccess')),
    deleteFailed: () => void message.error(t('statusManagement.deleteFailed'))
  };
}
