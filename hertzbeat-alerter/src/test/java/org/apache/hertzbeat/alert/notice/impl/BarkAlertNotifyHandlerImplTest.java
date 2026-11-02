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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.ResourceBundle;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link BarkAlertNotifyHandlerImpl}
 */
@ExtendWith(MockitoExtension.class)
class BarkAlertNotifyHandlerImplTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private AlerterProperties alerterProperties;

    @Mock
    private ResourceBundle bundle;

    @InjectMocks
    private BarkAlertNotifyHandlerImpl barkAlertNotifyHandler;

    private NoticeReceiver receiver;
    private GroupAlert groupAlert;
    private NoticeTemplate template;

    @BeforeEach
    public void setUp() {
        receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");
        receiver.setBarkDeviceKey("bark-device-key-xxxxx");

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

        lenient().when(alerterProperties.getBarkDefaultServerUrl())
                .thenReturn("https://api.day.app");
        lenient().when(bundle.getString("alerter.notify.title")).thenReturn("Alert Notification");
    }

    @Test
    public void testType() {
        assertEquals(17, barkAlertNotifyHandler.type());
    }

    @Test
    public void testNotifyAlertSuccessWhenCodeIsBarkSuccess() {
        ResponseEntity<BarkAlertNotifyHandlerImpl.BarkNotifyResp> responseEntity =
                new ResponseEntity<>(barkResp(200, "success"), HttpStatus.OK);

        when(restTemplate.postForEntity(
                any(String.class),
                any(),
                eq(BarkAlertNotifyHandlerImpl.BarkNotifyResp.class))).thenReturn(responseEntity);

        barkAlertNotifyHandler.send(receiver, template, groupAlert);

        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(
                eq("https://api.day.app/push"),
                entityCaptor.capture(),
                eq(BarkAlertNotifyHandlerImpl.BarkNotifyResp.class));
        BarkAlertNotifyHandlerImpl.BarkNotifyDto body =
                (BarkAlertNotifyHandlerImpl.BarkNotifyDto) entityCaptor.getValue().getBody();
        assertEquals("bark-device-key-xxxxx", body.getDeviceKey());
        assertEquals("Alert Notification", body.getTitle());
    }

    @Test
    public void testNotifyAlertUsesConfiguredServerUrlWithoutTrailingSlash() {
        receiver.setBarkServerUrl("https://bark.example.com/");
        ResponseEntity<BarkAlertNotifyHandlerImpl.BarkNotifyResp> responseEntity =
                new ResponseEntity<>(barkResp(200, "success"), HttpStatus.OK);

        when(restTemplate.postForEntity(
                any(String.class),
                any(),
                eq(BarkAlertNotifyHandlerImpl.BarkNotifyResp.class))).thenReturn(responseEntity);

        barkAlertNotifyHandler.send(receiver, template, groupAlert);

        verify(restTemplate).postForEntity(
                eq("https://bark.example.com/push"),
                any(),
                eq(BarkAlertNotifyHandlerImpl.BarkNotifyResp.class));
    }

    @Test
    public void testNotifyAlertFailureWhenCodeNotBarkSuccess() {
        ResponseEntity<BarkAlertNotifyHandlerImpl.BarkNotifyResp> responseEntity =
                new ResponseEntity<>(barkResp(400, "invalid device key"), HttpStatus.OK);

        when(restTemplate.postForEntity(
                any(String.class),
                any(),
                eq(BarkAlertNotifyHandlerImpl.BarkNotifyResp.class))).thenReturn(responseEntity);

        assertThrows(AlertNoticeException.class,
                () -> barkAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertFailureWhenHttpNotOk() {
        ResponseEntity<BarkAlertNotifyHandlerImpl.BarkNotifyResp> responseEntity =
                new ResponseEntity<>(barkResp(200, "success"), HttpStatus.BAD_REQUEST);

        when(restTemplate.postForEntity(
                any(String.class),
                any(),
                eq(BarkAlertNotifyHandlerImpl.BarkNotifyResp.class))).thenReturn(responseEntity);

        assertThrows(AlertNoticeException.class,
                () -> barkAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertFailureWhenMissingDeviceKey() {
        receiver.setBarkDeviceKey(null);
        assertThrows(AlertNoticeException.class,
                () -> barkAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    private static BarkAlertNotifyHandlerImpl.BarkNotifyResp barkResp(int code, String message) {
        BarkAlertNotifyHandlerImpl.BarkNotifyResp resp = new BarkAlertNotifyHandlerImpl.BarkNotifyResp();
        resp.setCode(code);
        resp.setMessage(message);
        return resp;
    }
}
