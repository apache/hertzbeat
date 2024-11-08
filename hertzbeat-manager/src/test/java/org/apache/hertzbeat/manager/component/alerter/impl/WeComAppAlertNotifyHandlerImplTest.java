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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.net.URI;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

/**
 * test case for {@link WeComAppAlertNotifyHandlerImpl}
 */

@ExtendWith(MockitoExtension.class)
class WeComAppAlertNotifyHandlerImplTest {

    @InjectMocks
    private WeComAppAlertNotifyHandlerImpl weComAppAlertNotifyHandler;

    @Mock
    private RestTemplate restTemplate;

    private NoticeReceiver receiver;

    private NoticeTemplate noticeTemplate;

    private Alert alert;

    @BeforeEach
    void setUp() {

        receiver = new NoticeReceiver();
        receiver.setCorpId("testCorpId");
        receiver.setAgentId(1000001);
        receiver.setAppSecret("testAppSecret");
        receiver.setUserId("testUserId");
        receiver.setPartyId("testPartyId");
        receiver.setTagId("testTagId");

        noticeTemplate = mock(NoticeTemplate.class);
        when(noticeTemplate.getContent()).thenReturn("This is a test notice template.");

        alert = new Alert();
        alert.setId(1L);
        alert.setLastAlarmTime(System.currentTimeMillis());
        alert.setContent("This is a test alert.");

        weComAppAlertNotifyHandler = new WeComAppAlertNotifyHandlerImpl(restTemplate);
    }

    @Test
    void testSendSuccess() throws AlertNoticeException {

        WeComAppAlertNotifyHandlerImpl.WeChatAppReq tokenResponse = new WeComAppAlertNotifyHandlerImpl.WeChatAppReq();
        tokenResponse.setAccessToken("testAccessToken");
        when(restTemplate.getForEntity(
                anyString(),
                eq(WeComAppAlertNotifyHandlerImpl.WeChatAppReq.class)
        )).thenReturn(ResponseEntity.ok(tokenResponse));

        WeComAppAlertNotifyHandlerImpl.WeChatAppReq sendResponse = new WeComAppAlertNotifyHandlerImpl.WeChatAppReq();
        sendResponse.setErrCode(0);
        sendResponse.setErrMsg("ok");
        when(restTemplate.postForEntity(
                anyString(),
                any(HttpEntity.class),
                eq(WeComAppAlertNotifyHandlerImpl.WeChatAppReq.class)
        )).thenReturn(ResponseEntity.ok(sendResponse));

        weComAppAlertNotifyHandler.send(receiver, noticeTemplate, alert);

        verify(restTemplate, times(1)).getForEntity(anyString(), eq(WeComAppAlertNotifyHandlerImpl.WeChatAppReq.class));
        verify(restTemplate, times(1)).postForEntity(anyString(), any(HttpEntity.class), eq(WeComAppAlertNotifyHandlerImpl.WeChatAppReq.class));
    }

    @Test
    void testSendFail() {

        WeComAppAlertNotifyHandlerImpl.WeChatAppReq tokenResponse = new WeComAppAlertNotifyHandlerImpl.WeChatAppReq();
        tokenResponse.setErrCode(40013);
        tokenResponse.setErrMsg("invalid corpid");
        when(restTemplate.getForEntity(
                anyString(),
                eq(WeComAppAlertNotifyHandlerImpl.WeChatAppReq.class)
        )).thenReturn(ResponseEntity.ok(tokenResponse));

        Assertions.assertThrows(
                AlertNoticeException.class,
                () -> weComAppAlertNotifyHandler.send(receiver, noticeTemplate, alert)
        );

        verify(restTemplate, never()).postForEntity(
                any(URI.class),
                any(HttpEntity.class),
                eq(WeComAppAlertNotifyHandlerImpl.WeChatAppReq.class)
        );
    }

}
