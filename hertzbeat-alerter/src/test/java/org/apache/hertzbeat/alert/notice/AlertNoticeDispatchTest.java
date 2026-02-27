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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
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
import org.mockito.junit.jupiter.MockitoExtension;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;

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
                emitterManager
        );
        
        receiver = NoticeReceiver.builder()
                .id(1L)
                .name("test-receiver")
                .type((byte) 1)
                .build();
        
        alert = GroupAlert.builder()
                .id(1L)
                .status("firing")
                .alerts(Collections.singletonList(SingleAlert.builder()
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
}
