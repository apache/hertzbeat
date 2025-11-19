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

import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.ResourceBundle;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Test case for FeiShu App Alert Notify
 */
@ExtendWith(MockitoExtension.class)
class FeiShuAppAlertNotifyHandlerImplTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ResourceBundle bundle;

    @Mock
    private AlerterProperties alerterProperties;

    @InjectMocks
    private FeiShuAppAlertNotifyHandlerImpl feiShuAppAlertNotifyHandler;

    private NoticeReceiver receiver;
    private GroupAlert groupAlert;
    private NoticeTemplate template;

    @BeforeEach
    public void setUp() {
        receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");
        receiver.setType((byte) 14);
        receiver.setAppId("cli-test-app-id");
        receiver.setAppSecret("test-app-secret");

        groupAlert = new GroupAlert();
        SingleAlert singleAlert = new SingleAlert();
        singleAlert.setLabels(new HashMap<>());
        singleAlert.getLabels().put("severity", "critical");
        singleAlert.getLabels().put("alertname", "Test Alert");

        List<SingleAlert> alerts = new ArrayList<>();
        alerts.add(singleAlert);
        groupAlert.setAlerts(alerts);

        template = new NoticeTemplate();
        template.setId(1L);
        template.setName("test-template");
        template.setContent("test content");

        lenient().when(bundle.getString("alerter.notify.title")).thenReturn("Alert Notification");
        lenient().when(alerterProperties.getConsoleUrl()).thenReturn("https://console.hertzbeat.com");
    }

    /**
     * Test successful notification to single user
     */
    @Test
    public void testNotifyAlertSuccessSingleUser() {
        // Setup receiver for single user
        receiver.setLarkReceiveType((byte) 0);
        receiver.setUserId("user-001");

        // Mock access token response
        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse accessTokenResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse();
        accessTokenResp.setCode(0);
        accessTokenResp.setMsg("success");
        accessTokenResp.setTenantAccessToken("test-access-token");

        // Mock message send response
        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse messageResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse();
        messageResp.setCode(0);
        messageResp.setMsg("success");

        // Mock restTemplate calls
        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse.class)))
                .thenReturn(new ResponseEntity<>(accessTokenResp, HttpStatus.OK));

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse.class)))
                .thenReturn(new ResponseEntity<>(messageResp, HttpStatus.OK));
        feiShuAppAlertNotifyHandler.send(receiver, template, groupAlert);
    }

    /**
     * Test successful notification to multiple users
     */
    @Test
    public void testNotifyAlertSuccessMultipleUsers() {
        receiver.setLarkReceiveType((byte) 0);
        receiver.setUserId("user-001,user-002,user-003");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse accessTokenResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse();
        accessTokenResp.setCode(0);
        accessTokenResp.setMsg("success");
        accessTokenResp.setTenantAccessToken("test-access-token");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse messageResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse();
        messageResp.setCode(0);
        messageResp.setMsg("success");

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse.class)))
                .thenReturn(new ResponseEntity<>(accessTokenResp, HttpStatus.OK));

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse.class)))
                .thenReturn(new ResponseEntity<>(messageResp, HttpStatus.OK));

        feiShuAppAlertNotifyHandler.send(receiver, template, groupAlert);
    }

    /**
     * Test successful notification to chat
     */
    @Test
    public void testNotifyAlertSuccessChat() {
        receiver.setLarkReceiveType((byte) 1);
        receiver.setChatId("chat-001");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse accessTokenResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse();
        accessTokenResp.setCode(0);
        accessTokenResp.setMsg("success");
        accessTokenResp.setTenantAccessToken("test-access-token");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse messageResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse();
        messageResp.setCode(0);
        messageResp.setMsg("success");

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse.class)))
                .thenReturn(new ResponseEntity<>(accessTokenResp, HttpStatus.OK));

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse.class)))
                .thenReturn(new ResponseEntity<>(messageResp, HttpStatus.OK));

        feiShuAppAlertNotifyHandler.send(receiver, template, groupAlert);
    }

    /**
     * Test successful notification to departments
     */
    @Test
    public void testNotifyAlertSuccessDepartments() {
        receiver.setLarkReceiveType((byte) 2);
        receiver.setPartyId("dept-001,dept-002");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse accessTokenResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse();
        accessTokenResp.setCode(0);
        accessTokenResp.setMsg("success");
        accessTokenResp.setTenantAccessToken("test-access-token");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse messageResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse();
        messageResp.setCode(0);
        messageResp.setMsg("success");

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse.class)))
                .thenReturn(new ResponseEntity<>(accessTokenResp, HttpStatus.OK));

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse.class)))
                .thenReturn(new ResponseEntity<>(messageResp, HttpStatus.OK));

        feiShuAppAlertNotifyHandler.send(receiver, template, groupAlert);
    }

    /**
     * Test notification failure due to access token error
     */
    @Test
    public void testNotifyAlertFailureAccessToken() {
        receiver.setLarkReceiveType((byte) 0);
        receiver.setUserId("user-001");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse accessTokenResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse();
        accessTokenResp.setCode(999);
        accessTokenResp.setMsg("Invalid app credentials");

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse.class)))
                .thenReturn(new ResponseEntity<>(accessTokenResp, HttpStatus.OK));

        assertThrows(AlertNoticeException.class, () -> {
            feiShuAppAlertNotifyHandler.send(receiver, template, groupAlert);
        });
    }

    /**
     * Test notification failure due to message send error
     */
    @Test
    public void testNotifyAlertFailureMessageSend() {
        receiver.setLarkReceiveType((byte) 0);
        receiver.setUserId("user-001");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse accessTokenResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse();
        accessTokenResp.setCode(0);
        accessTokenResp.setMsg("success");
        accessTokenResp.setTenantAccessToken("test-access-token");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse messageResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse();
        messageResp.setCode(999);
        messageResp.setMsg("User not found");

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse.class)))
                .thenReturn(new ResponseEntity<>(accessTokenResp, HttpStatus.OK));

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppResponse.class)))
                .thenReturn(new ResponseEntity<>(messageResp, HttpStatus.OK));

        assertThrows(AlertNoticeException.class, () -> {
            feiShuAppAlertNotifyHandler.send(receiver, template, groupAlert);
        });
    }

    /**
     * Test invalid larkReceiveType
     */
    @Test
    public void testInvalidLarkReceiveType() {
        receiver.setLarkReceiveType((byte) 99);
        receiver.setUserId("user-001");

        FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse accessTokenResp =
                new FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse();
        accessTokenResp.setCode(0);
        accessTokenResp.setMsg("success");
        accessTokenResp.setTenantAccessToken("test-access-token");

        when(restTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(),
                eq(FeiShuAppAlertNotifyHandlerImpl.FeiShuAppAccessTokenResponse.class)))
                .thenReturn(new ResponseEntity<>(accessTokenResp, HttpStatus.OK));

        assertThrows(AlertNoticeException.class, () -> {
            feiShuAppAlertNotifyHandler.send(receiver, template, groupAlert);
        });
    }
}
