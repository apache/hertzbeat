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

package org.apache.hertzbeat.alert.notice;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyByte;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.config.AlertSseManager;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Test case for Alert Notice Dispatch
 */
@ExtendWith(MockitoExtension.class)
class AlertNoticeDispatchTest {

    @Mock
    private AlerterWorkerPool workerPool;

    @Mock
    private NoticeConfigService noticeConfigService;

    @Mock
    private AlertStoreHandler alertStoreHandler;

    @Mock
    private PluginRunner pluginRunner;

    @Mock
    private AlertNotifyHandler alertNotifyHandler;

    @Mock
    private AlertSseManager emitterManager;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private AlertNoticeDispatch alertNoticeDispatch;

    private static final int DISPATCH_THREADS = 3;

    private NoticeReceiver receiver;
    private GroupAlert alert;

    @BeforeEach
    void setUp() {
        when(alertNotifyHandler.type()).thenReturn((byte) 1);

        List<AlertNotifyHandler> alertNotifyHandlerList = List.of(alertNotifyHandler);
        alertNoticeDispatch = new AlertNoticeDispatch(
                workerPool,
                noticeConfigService,
                alertStoreHandler,
                alertNotifyHandlerList,
                pluginRunner,
                emitterManager,
                eventPublisher
        );

        receiver = NoticeReceiver.builder()
                .id(1L)
                .name("test-receiver")
                .type((byte) 1)
                .build();

        alert = GroupAlert.builder()
                .id(1L)
                .workspaceId("default")
                .status("firing")
                .alerts(Collections.singletonList(SingleAlert.builder()
                        .id(2L)
                        .workspaceId("default")
                        .content("test-content")
                        .build()))
                .build();
    }

    @Test
    void testSendNoticeMsg() {
        NoticeTemplate template = new NoticeTemplate();
        template.setId(1L);
        template.setName("default-template");
        when(noticeConfigService.getDefaultNoticeTemplateByType((byte) 1)).thenReturn(template);
        doNothing().when(alertNotifyHandler).send(eq(receiver), eq(template), eq(alert));

        assertTrue(alertNoticeDispatch.sendNoticeMsg(receiver, null, alert));
        verify(alertNotifyHandler).send(eq(receiver), eq(template), eq(alert));
    }

    @Test
    void testSendNoticeMsgReceiverNull() {
        GroupAlert alert = new GroupAlert();
        alert.setId(1L);
        alert.setStatus("firing");

        boolean result = alertNoticeDispatch.sendNoticeMsg(null, null, alert);
        assertFalse(result);
    }

    @Test
    void testSendNoticeMsgReceiverTypeNull() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");

        GroupAlert alert = new GroupAlert();
        alert.setId(1L);
        alert.setStatus("firing");

        boolean result = alertNoticeDispatch.sendNoticeMsg(receiver, null, alert);
        assertFalse(result);
    }

    @Test
    void testSendNoticeMsgNoHandler() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");
        receiver.setType((byte) 2);

        GroupAlert alert = new GroupAlert();
        alert.setId(1L);
        alert.setStatus("firing");

        assertFalse(alertNoticeDispatch.sendNoticeMsg(receiver, null, alert));
    }

    @Test
    void testDispatchAlarmUsesTypedNotifyExecution() {
        NoticeTemplate template = new NoticeTemplate();
        template.setId(1L);
        template.setName("default-template");

        when(alertStoreHandler.store(alert)).thenReturn(alert);
        when(noticeConfigService.getReceiverFilterRule(alert)).thenReturn(Collections.singletonList(
                org.apache.hertzbeat.common.entity.alerter.NoticeRule.builder()
                        .receiverId(Collections.singletonList(1L))
                        .templateId(1L)
                        .build()));
        when(noticeConfigService.getReceiverById(1L)).thenReturn(receiver);
        when(noticeConfigService.getOneTemplateById(1L)).thenReturn(template);
        doNothing().when(alertNotifyHandler).send(eq(receiver), eq(template), eq(alert));
        doAnswer(invocation -> {
            Runnable task = invocation.getArgument(1);
            task.run();
            return null;
        }).when(workerPool).executeNotify(anyByte(), any(Runnable.class));

        alertNoticeDispatch.dispatchAlarm(alert);

        verify(workerPool).executeNotify(eq((byte) 1), any(Runnable.class));
        verify(alertNotifyHandler).send(eq(receiver), eq(template), eq(alert));
        verify(emitterManager).broadcast(eq("default"), any(String.class));
        ArgumentCaptor<SingleAlert.CreatedEvent> createdEvent =
                ArgumentCaptor.forClass(SingleAlert.CreatedEvent.class);
        verify(eventPublisher).publishEvent(createdEvent.capture());
        org.junit.jupiter.api.Assertions.assertEquals(2L, createdEvent.getValue().alert().getId());
        org.junit.jupiter.api.Assertions.assertEquals("default", createdEvent.getValue().alert().getWorkspaceId());
    }

    @Test
    void postStoreFailureDoesNotChangeMetadataSuccessOutcome() {
        when(alertStoreHandler.store(alert)).thenReturn(alert);
        when(noticeConfigService.getReceiverFilterRule(alert))
                .thenThrow(new IllegalStateException("notice unavailable"));
        doThrow(new IllegalStateException("broadcast unavailable"))
                .when(emitterManager).broadcast(eq("default"), any(String.class));

        assertTrue(alertNoticeDispatch.dispatchAlarm(alert));

        verify(alertStoreHandler, times(1)).store(alert);
        verify(emitterManager).broadcast(eq("default"), any(String.class));
    }

    @Test
    void storeFailureDoesNotPublishCreatedEvent() {
        when(alertStoreHandler.store(alert)).thenThrow(new IllegalStateException("store failed"));

        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> alertNoticeDispatch.dispatchAlarm(alert));

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void outerRollbackDoesNotPublishAnyPostStoreSideEffect() {
        when(alertStoreHandler.store(alert)).thenReturn(alert);
        TransactionTemplate transaction = new TransactionTemplate(new RecordingTransactionManager());

        transaction.executeWithoutResult(status -> {
            assertTrue(alertNoticeDispatch.dispatchAlarm(alert));
            verify(eventPublisher, never()).publishEvent(any());
            verify(noticeConfigService, never()).getReceiverFilterRule(any());
            verifyNoInteractions(pluginRunner);
            verify(emitterManager, never()).broadcast(any(), any());
            status.setRollbackOnly();
        });

        verify(eventPublisher, never()).publishEvent(any());
        verify(noticeConfigService, never()).getReceiverFilterRule(any());
        verifyNoInteractions(pluginRunner);
        verify(emitterManager, never()).broadcast(any(), any());
    }

    private static final class RecordingTransactionManager extends AbstractPlatformTransactionManager {

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            // Synchronization callbacks are the contract under test.
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            // No external resource is needed.
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            // No external resource is needed.
        }
    }
}
