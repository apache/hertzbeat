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
 * Test case for {@link WpushAlertNotifyHandlerImpl}
 */
@ExtendWith(MockitoExtension.class)
class WpushAlertNotifyHandlerImplTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private AlerterProperties alerterProperties;

    @Mock
    private ResourceBundle bundle;

    @InjectMocks
    private WpushAlertNotifyHandlerImpl wpushAlertNotifyHandler;

    private NoticeReceiver receiver;
    private GroupAlert groupAlert;
    private NoticeTemplate template;

    @BeforeEach
    public void setUp() {
        receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");
        receiver.setWpushToken("wpush-test-apikey-xxxxx");
        receiver.setWpushChannel("wechat");
        receiver.setWpushTopicCode("topic-demo");

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

        lenient().when(alerterProperties.getWpushWebhookUrl())
                .thenReturn("https://api.wpush.cn/api/v1/send");
        lenient().when(bundle.getString("alerter.notify.title")).thenReturn("Alert Notification");
    }

    @Test
    public void testType() {
        assertEquals(16, wpushAlertNotifyHandler.type());
    }

    @Test
    public void testNotifyAlertSuccessWhenCodeIsZero() {
        CommonRobotNotifyResp successResp = new CommonRobotNotifyResp();
        successResp.setCode(0);
        successResp.setMsg("success");
        ResponseEntity<CommonRobotNotifyResp> responseEntity =
                new ResponseEntity<>(successResp, HttpStatus.OK);

        when(restTemplate.postForEntity(
                any(String.class),
                any(),
                eq(CommonRobotNotifyResp.class))).thenReturn(responseEntity);

        wpushAlertNotifyHandler.send(receiver, template, groupAlert);

        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(
                eq("https://api.wpush.cn/api/v1/send"),
                entityCaptor.capture(),
                eq(CommonRobotNotifyResp.class));
        WpushAlertNotifyHandlerImpl.WpushNotifyDto body =
                (WpushAlertNotifyHandlerImpl.WpushNotifyDto) entityCaptor.getValue().getBody();
        assertEquals("wpush-test-apikey-xxxxx", body.getApikey());
        assertEquals("Alert Notification", body.getTitle());
        assertEquals("wechat", body.getChannel());
        assertEquals("topic-demo", body.getTopicCode());
    }

    @Test
    public void testNotifyAlertFailureWhenCodeNonZero() {
        CommonRobotNotifyResp failResp = new CommonRobotNotifyResp();
        failResp.setCode(1);
        failResp.setMsg("invalid apikey");
        ResponseEntity<CommonRobotNotifyResp> responseEntity =
                new ResponseEntity<>(failResp, HttpStatus.OK);

        when(restTemplate.postForEntity(
                any(String.class),
                any(),
                eq(CommonRobotNotifyResp.class))).thenReturn(responseEntity);

        assertThrows(AlertNoticeException.class,
                () -> wpushAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertFailureWhenHttpNotOk() {
        CommonRobotNotifyResp failResp = new CommonRobotNotifyResp();
        failResp.setCode(0);
        ResponseEntity<CommonRobotNotifyResp> responseEntity =
                new ResponseEntity<>(failResp, HttpStatus.BAD_REQUEST);

        when(restTemplate.postForEntity(
                any(String.class),
                any(),
                eq(CommonRobotNotifyResp.class))).thenReturn(responseEntity);

        assertThrows(AlertNoticeException.class,
                () -> wpushAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertFailureWhenMissingToken() {
        receiver.setWpushToken(null);
        assertThrows(AlertNoticeException.class,
                () -> wpushAlertNotifyHandler.send(receiver, template, groupAlert));
    }
}
