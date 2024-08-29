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

package org.apache.hertzbeat.manager.component.alerter.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.service.TencentSmsClient;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

/**
 * test case for {@link SmsAlertNotifyHandlerImpl}
 */

class SmsAlertNotifyHandlerImplTest {


    @Mock
    private TencentSmsClient tencentSmsClient;

    private SmsAlertNotifyHandlerImpl notifyHandler;

    private NoticeTemplate noticeTemplate;

    private NoticeReceiver receiver;

    private ResourceBundle bundle;

    @BeforeEach
    public void setUp() {

        MockitoAnnotations.openMocks(this);

        noticeTemplate = mock(NoticeTemplate.class);
        when(noticeTemplate.getContent()).thenReturn("This is a test notice template.");

        receiver = mock(NoticeReceiver.class);
        when(receiver.getPhone()).thenReturn("1234567890");

        bundle = mock(ResourceBundle.class);
        when(bundle.getString(anyString())).thenReturn("High");

        Locale.setDefault(Locale.ENGLISH);

        notifyHandler = new SmsAlertNotifyHandlerImpl(tencentSmsClient);
    }

    @Test
    public void testSendSuccess() throws AlertNoticeException {

        Alert alert = Alert.builder()
                .content("Alert Content")
                .priority((byte) 1)
                .target("TestTarget")
                .tags(Map.of(CommonConstants.TAG_MONITOR_NAME, "MonitorName"))
                .lastAlarmTime(System.currentTimeMillis())
                .id(1L)
                .build();
        when(bundle.getString("alerter.priority.1")).thenReturn("High");

        notifyHandler.send(receiver, noticeTemplate, alert);

        String[] expectedParams = {"MonitorName", "Critical Alert", "Alert Content"};
        verify(tencentSmsClient).sendMessage(expectedParams, new String[]{"1234567890"});
    }

    @Test
    public void testSendFailed() {

        Alert alert = Alert.builder()
                .content("Alert Content")
                .priority((byte) 1)
                .target("TestTarget")
                .tags(Map.of(CommonConstants.TAG_MONITOR_NAME, "MonitorName"))
                .lastAlarmTime(System.currentTimeMillis())
                .id(1L)
                .build();
        Mockito.when(bundle.getString("alerter.priority.1")).thenReturn("High");

        doThrow(new RuntimeException("[Sms Notify Error]")).when(tencentSmsClient).sendMessage(any(), any());

        Exception exception = Assertions.assertThrows(
                AlertNoticeException.class,
                () -> notifyHandler.send(receiver, noticeTemplate, alert)
        );
        assertEquals("[Sms Notify Error] [Sms Notify Error]", exception.getMessage());
    }

}
