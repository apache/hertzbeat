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

package org.apache.hertzbeat.alert.notice.impl;

import com.google.common.util.concurrent.Striped;
import java.util.List;
import java.util.concurrent.locks.Lock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.notice.AlertStoreHandler;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Alarm data persistence - landing in the database
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DbAlertStoreHandlerImpl implements AlertStoreHandler {

    private static final Striped<Lock> STORE_LOCKS = Striped.lazyWeakLock(1024);

    private final DbAlertStoreTransaction storeTransaction;

    @Override
    public GroupAlert store(GroupAlert groupAlert) {
        if (groupAlert == null || groupAlert.getAlerts() == null || groupAlert.getAlerts().isEmpty()) {
            log.error("The Group Alerts is empty, ignore store");
            return groupAlert;
        }
        String workspaceId = requireWorkspace(groupAlert.getWorkspaceId());
        groupAlert.setWorkspaceId(workspaceId);
        if (groupAlert.getAlerts().stream().anyMatch(alert -> alert == null
                || !workspaceId.equals(alert.getWorkspaceId()))) {
            throw new IllegalArgumentException("alert_workspace_mismatch");
        }
        List<Lock> locks = locksFor(STORE_LOCKS, lockKeys(groupAlert, workspaceId));
        locks.forEach(Lock::lock);
        boolean releaseAfterDelegate = true;
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            if (!TransactionSynchronizationManager.isSynchronizationActive()) {
                unlockReverse(locks);
                throw new IllegalStateException("transaction_synchronization_required");
            }
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    unlockReverse(locks);
                }
            });
            releaseAfterDelegate = false;
        }
        try {
            return storeTransaction.storeLocked(groupAlert);
        } finally {
            if (releaseAfterDelegate) {
                unlockReverse(locks);
            }
        }
    }

    private static List<String> lockKeys(GroupAlert groupAlert, String workspaceId) {
        List<String> keys = groupAlert.getAlerts().stream()
                .map(alert -> workspaceId + "\0single\0" + alert.getFingerprint())
                .distinct()
                .sorted()
                .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));
        keys.add(workspaceId + "\0group\0" + groupAlert.getGroupKey());
        keys.sort(String::compareTo);
        return keys;
    }

    static List<Lock> locksFor(Striped<Lock> stripes, List<String> keys) {
        return java.util.stream.StreamSupport.stream(
                stripes.bulkGet(keys).spliterator(), false).toList();
    }

    private static void unlockReverse(List<Lock> locks) {
        for (int index = locks.size() - 1; index >= 0; index--) {
            locks.get(index).unlock();
        }
    }

    private static String requireWorkspace(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new IllegalArgumentException("workspace_required");
        }
        return workspaceId;
    }

}
