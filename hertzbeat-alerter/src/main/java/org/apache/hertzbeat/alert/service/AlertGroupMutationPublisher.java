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

package org.apache.hertzbeat.alert.service;

import java.util.Collection;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.config.AlertSseManager;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Publishes safe alert group mutation events after authoritative state commits.
 */
@Slf4j
@Component
public class AlertGroupMutationPublisher {

    private final AlertSseManager alertSseManager;

    public AlertGroupMutationPublisher(AlertSseManager alertSseManager) {
        this.alertSseManager = alertSseManager;
    }

    public void publishStatusChanged(Collection<Long> ids, String status) {
        publishAfterCommit(ids, status, GroupMutation.STATUS_CHANGED);
    }

    public void publishDeleted(Collection<Long> ids) {
        publishAfterCommit(ids, null, GroupMutation.DELETED);
    }

    private void publishAfterCommit(Collection<Long> ids, String status, GroupMutation mutation) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        List<Long> sortedIds = ids.stream().distinct().sorted().toList();
        AlertGroupMutationEvent event =
                new AlertGroupMutationEvent(sortedIds.get(0), sortedIds, status, mutation.eventName);
        String payload = JsonUtil.toJson(event);
        Runnable publication = () -> safelyBroadcast(payload);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            // AlertService is transactional in production. Immediate publication is the explicit
            // boundary for direct non-transactional calls such as maintenance tools and unit tests.
            publication.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publication.run();
            }
        });
    }

    private void safelyBroadcast(String payload) {
        try {
            alertSseManager.broadcastGroupMutation(payload);
        } catch (RuntimeException exception) {
            log.warn("Failed to broadcast committed alert mutation: {}",
                    exception.getClass().getSimpleName());
        }
    }

    private enum GroupMutation {
        STATUS_CHANGED("GROUP_STATUS_CHANGED"),
        DELETED("GROUP_DELETED");

        private final String eventName;

        GroupMutation(String eventName) {
            this.eventName = eventName;
        }
    }

    private record AlertGroupMutationEvent(Long id, List<Long> ids, String status, String mutation) {
    }
}
