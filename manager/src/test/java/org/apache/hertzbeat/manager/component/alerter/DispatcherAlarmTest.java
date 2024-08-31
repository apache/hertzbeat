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

package org.apache.hertzbeat.manager.component.alerter;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.List;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.manager.service.NoticeConfigService;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link DispatcherAlarm}
 */

@ExtendWith(MockitoExtension.class)
class DispatcherAlarmTest {

    @Mock
    private AlerterWorkerPool workerPool;

    @Mock
    private CommonDataQueue dataQueue;

    @Mock
    private NoticeConfigService noticeConfigService;

    @Mock
    private AlertStoreHandler alertStoreHandler;

    @Mock
    private PluginRunner pluginRunner;

    @Mock
    private AlertNotifyHandler alertNotifyHandler;

    private DispatcherAlarm dispatcherAlarm;

    private static final int DISPATCH_THREADS = 3;

    @BeforeEach
    void setUp() {

        List<AlertNotifyHandler> alertNotifyHandlerList = List.of(alertNotifyHandler);
        dispatcherAlarm = new DispatcherAlarm(
                workerPool,
                dataQueue,
                noticeConfigService,
                alertStoreHandler,
                alertNotifyHandlerList,
                pluginRunner
        );
    }

    @Test
    void testAfterPropertiesSet() {

        dispatcherAlarm.afterPropertiesSet();
        verify(workerPool, times(DISPATCH_THREADS)).executeJob(any(Runnable.class));
    }

    @Test
    void testSendNoticeMsg() {

        NoticeReceiver receiver = mock(NoticeReceiver.class);
        NoticeTemplate noticeTemplate = mock(NoticeTemplate.class);
        Alert alert = mock(Alert.class);

        assertTrue(dispatcherAlarm.sendNoticeMsg(receiver, noticeTemplate, alert));
        verify(alertNotifyHandler).send(receiver, noticeTemplate, alert);
    }

    @Test
    void testSendNoticeMsgReceiverNull() {

        Alert alert = mock(Alert.class);
        boolean result = dispatcherAlarm.sendNoticeMsg(null, null, alert);
        assertFalse(result);
    }

    @Test
    void testSendNoticeMsgReceiverTypeNull() {

        NoticeReceiver receiver = mock(NoticeReceiver.class);
        Alert alert = mock(Alert.class);
        when(receiver.getType()).thenReturn(null);

        boolean result = dispatcherAlarm.sendNoticeMsg(receiver, null, alert);
        assertFalse(result);
    }

    @Test
    void testSendNoticeMsgNoHandler() {

        NoticeReceiver receiver = mock(NoticeReceiver.class);
        Alert alert = mock(Alert.class);
        when(receiver.getType()).thenReturn((byte) 2);

        assertFalse(dispatcherAlarm.sendNoticeMsg(receiver, null, alert));
    }

}
