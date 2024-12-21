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


import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link WebHookAlertNotifyHandlerImpl}
 */

@Slf4j
class WebHookAlertNotifyHandlerImplTest {

    @Mock
    private RestTemplate restTemplate;

    private WebHookAlertNotifyHandlerImpl notifyHandler;

    private NoticeTemplate noticeTemplate;

    private NoticeReceiver receiver;

    @BeforeEach
    public void setUp() {

        MockitoAnnotations.openMocks(this);

        noticeTemplate = mock(NoticeTemplate.class);
        when(noticeTemplate.getContent()).thenReturn("This is a test notice template.");

        receiver = mock(NoticeReceiver.class);
        when(receiver.getHookUrl()).thenReturn("http://localhost:8080/hook/");

        notifyHandler = new WebHookAlertNotifyHandlerImpl();
        ReflectionTestUtils.setField(notifyHandler, "restTemplate", restTemplate);
    }

    @Test
    public void testSendSuccess() throws AlertNoticeException {

        Alert alert = Alert.builder()
                .content("Alert Content")
                .lastAlarmTime(System.currentTimeMillis())
                .id(1L)
                .build();

        when(restTemplate.postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(String.class))
        ).thenReturn(new ResponseEntity<>("", HttpStatus.OK));

        assertDoesNotThrow(() -> notifyHandler.send(receiver, noticeTemplate, alert));

        verify(restTemplate).postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(String.class)
        );
        verify(restTemplate, times(1)).postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(String.class)
        );
        verifyNoMoreInteractions(restTemplate);
    }

    @Test
    public void testSendFailed() {

        Alert alert = Alert.builder()
                .content("Alert Content")
                .lastAlarmTime(System.currentTimeMillis())
                .id(1L)
                .build();

        when(restTemplate.postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(String.class))
        ).thenReturn(new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR));

        AlertNoticeException exception = assertThrows(
                AlertNoticeException.class,
                () -> notifyHandler.send(receiver, noticeTemplate, alert)
        );

        assertEquals("[WebHook Notify Error] Http StatusCode 500 INTERNAL_SERVER_ERROR", exception.getMessage());
        verify(restTemplate).postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(String.class));
        verifyNoMoreInteractions(restTemplate);
    }

}
