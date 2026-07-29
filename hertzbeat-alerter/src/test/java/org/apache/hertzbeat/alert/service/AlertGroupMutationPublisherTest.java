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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.config.AlertSseManager;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.core.type.TypeReference;

/**
 * Transaction and safe-payload contracts for alert group mutation publication.
 */
class AlertGroupMutationPublisherTest {

    @Test
    void statusRefreshPublishesSafeSortedPayloadOnlyAfterCommit() {
        AlertSseManager manager = Mockito.mock(AlertSseManager.class);
        AlertGroupMutationPublisher publisher = new AlertGroupMutationPublisher(manager);
        TransactionSynchronizationManager.initSynchronization();
        try {
            publisher.publishStatusChanged(List.of(2L, 1L, 2L), "acknowledged");

            verify(manager, never()).broadcastGroupMutation(anyString());
            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(TransactionSynchronization::afterCommit);

            assertMutationEvent(manager, List.of(1L, 2L), "acknowledged", "GROUP_STATUS_CHANGED");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void deleteTombstonePublishesOnlyAfterCommit() {
        AlertSseManager manager = Mockito.mock(AlertSseManager.class);
        AlertGroupMutationPublisher publisher = new AlertGroupMutationPublisher(manager);
        TransactionSynchronizationManager.initSynchronization();
        try {
            publisher.publishDeleted(List.of(2L, 1L));

            verify(manager, never()).broadcastGroupMutation(anyString());
            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(TransactionSynchronization::afterCommit);

            assertMutationEvent(manager, List.of(1L, 2L), null, "GROUP_DELETED");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void rolledBackTransactionDoesNotBroadcast() {
        AlertSseManager manager = Mockito.mock(AlertSseManager.class);
        AlertGroupMutationPublisher publisher = new AlertGroupMutationPublisher(manager);
        TransactionSynchronizationManager.initSynchronization();
        try {
            publisher.publishDeleted(List.of(1L));

            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(synchronization ->
                            synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

            verify(manager, never()).broadcastGroupMutation(anyString());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void emptyOrNullTargetsDoNotRegisterOrBroadcast() {
        AlertSseManager manager = Mockito.mock(AlertSseManager.class);
        AlertGroupMutationPublisher publisher = new AlertGroupMutationPublisher(manager);
        TransactionSynchronizationManager.initSynchronization();
        try {
            publisher.publishDeleted(List.of());
            publisher.publishStatusChanged(null, "acknowledged");

            assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
            verify(manager, never()).broadcastGroupMutation(anyString());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void nonTransactionalBroadcastFailureDoesNotLeakPayloadOrExceptionMessage() {
        String privateDetail = "private-mutation-body-and-exception";
        AlertSseManager manager = Mockito.mock(AlertSseManager.class);
        doThrow(new IllegalStateException(privateDetail))
                .when(manager).broadcastGroupMutation(anyString());
        AlertGroupMutationPublisher publisher = new AlertGroupMutationPublisher(manager);
        Logger logger = (Logger) LoggerFactory.getLogger(AlertGroupMutationPublisher.class);
        Level originalLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            publisher.publishDeleted(List.of(1L));

            String logs = appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .reduce("", String::concat);
            assertFalse(logs.contains(privateDetail));
            assertTrue(logs.contains(IllegalStateException.class.getSimpleName()));
        } finally {
            logger.setLevel(originalLevel);
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    private static void assertMutationEvent(
            AlertSseManager manager, List<Long> ids, String status, String mutation) {
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(manager).broadcastGroupMutation(payload.capture());
        Map<String, Object> event = JsonUtil.fromJson(payload.getValue(), new TypeReference<>() {
        });
        assertEquals(ids.get(0).longValue(), ((Number) event.get("id")).longValue());
        List<Long> eventIds = ((List<?>) event.get("ids")).stream()
                .map(Number.class::cast)
                .map(Number::longValue)
                .toList();
        assertEquals(ids, eventIds);
        assertEquals(status, event.get("status"));
        assertEquals(mutation, event.get("mutation"));
        assertNull(event.get("content"));
        assertNull(event.get("annotations"));
    }
}
