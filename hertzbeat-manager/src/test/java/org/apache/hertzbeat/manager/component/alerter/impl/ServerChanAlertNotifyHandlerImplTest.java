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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

/**
 * test case for {@link ServerChanAlertNotifyHandlerImpl}
 */

class ServerChanAlertNotifyHandlerImplTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private HttpHeaders headers;

    private ServerChanAlertNotifyHandlerImpl notifyHandler;

    private NoticeTemplate noticeTemplate;

    private NoticeReceiver receiver;

    private AlerterProperties alerterProperties;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        noticeTemplate = mock(NoticeTemplate.class);
        when(noticeTemplate.getContent()).thenReturn("This is a test notice template.");

        receiver = mock(NoticeReceiver.class);
        when(receiver.getAccessToken()).thenReturn("dummyToken");

        alerterProperties = mock(AlerterProperties.class);
        when(alerterProperties.getServerChanWebhookUrl()).thenReturn("http://localhost:8080/webhook/%s");

        notifyHandler = new ServerChanAlertNotifyHandlerImpl();
        ReflectionTestUtils.setField(notifyHandler, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(notifyHandler, "alerterProperties", alerterProperties);
    }

    @Test
    void testSendSuccess() {

        Alert alert = Alert.builder()
                .content("Alert Content")
                .lastAlarmTime(System.currentTimeMillis())
                .id(1L)
                .build();

        ServerChanAlertNotifyHandlerImpl.ServerChanWebHookDto serverChanWebHookDto =
                new ServerChanAlertNotifyHandlerImpl.ServerChanWebHookDto();
        serverChanWebHookDto.setTitle("Test Title");
        serverChanWebHookDto.setDesp("Test Message");

        ResponseEntity<CommonRobotNotifyResp> mockResponseEntity =
                new ResponseEntity<>(new CommonRobotNotifyResp(), HttpStatus.OK);
        when(restTemplate.postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(CommonRobotNotifyResp.class))
        ).thenReturn(mockResponseEntity);

        notifyHandler.send(receiver, noticeTemplate, alert);

        verify(restTemplate, times(1)).postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(CommonRobotNotifyResp.class)
        );
    }

    @Test
    void testSendFailed() {

        Alert alert = Alert.builder()
                .content("Alert Content")
                .lastAlarmTime(System.currentTimeMillis())
                .id(1L)
                .build();

        when(restTemplate.postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(CommonRobotNotifyResp.class))
        ).thenThrow(new RuntimeException("Simulated failure"));

        AlertNoticeException exception = assertThrows(
                AlertNoticeException.class,
                () -> notifyHandler.send(receiver, noticeTemplate, alert)
        );
        assertTrue(exception.getMessage().contains("[ServerChan Notify Error]"));

        verify(restTemplate, times(1)).postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(CommonRobotNotifyResp.class)
        );
    }

}
