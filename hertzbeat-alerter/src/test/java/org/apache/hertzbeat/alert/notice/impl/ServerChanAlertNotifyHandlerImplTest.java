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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.ResourceBundle;

/**
 * Test case for ServerChan Alert Notify
 */
@ExtendWith(MockitoExtension.class)
class ServerChanAlertNotifyHandlerImplTest {
    
    @Mock
    private RestTemplate restTemplate;
    
    @Mock
    private AlerterProperties alerterProperties;
    
    @Mock
    private ResourceBundle bundle;
    
    @InjectMocks
    private ServerChanAlertNotifyHandlerImpl serverChanAlertNotifyHandler;
    
    private NoticeReceiver receiver;
    private GroupAlert groupAlert;
    private NoticeTemplate template;
    
    @BeforeEach
    public void setUp() {
        receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");
        receiver.setAccessToken("test-token");
        receiver.setServerChanToken("SCT-test-token");
        
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
        
        lenient().when(alerterProperties.getServerChanWebhookUrl())
                .thenReturn("https://sctapi.ftqq.com/%s.send");
        lenient().when(bundle.getString("alerter.notify.title")).thenReturn("Alert Notification");
    }
    
    @Test
    public void testNotifyAlertSuccess() {
        CommonRobotNotifyResp successResp = new CommonRobotNotifyResp();
        successResp.setCode(0);
        successResp.setMsg("success");
        ResponseEntity<CommonRobotNotifyResp> responseEntity = new ResponseEntity<>(successResp, HttpStatus.OK);
        
        when(restTemplate.postForEntity(
                any(String.class),
                any(),
                eq(CommonRobotNotifyResp.class))).thenReturn(responseEntity);
        
        serverChanAlertNotifyHandler.send(receiver, template, groupAlert);
    }
    
    @Test
    public void testNotifyAlertWithInvalidUrl() {
        when(alerterProperties.getServerChanWebhookUrl()).thenReturn("http://invalid-url.com/%s");
        
        assertThrows(AlertNoticeException.class,
                () -> serverChanAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    void testNotifyAlertWithSuccessfulJsonResponse() {
        MockRestServiceServer mockServer = createMockServer();
        mockServer.expect(requestTo("https://sctapi.ftqq.com/SCT-test-token.send"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"code\":0,\"message\":\"\",\"data\":{\"pushid\":\"test-push\"}}",
                        MediaType.APPLICATION_JSON));

        assertDoesNotThrow(() -> serverChanAlertNotifyHandler.send(receiver, template, groupAlert));

        mockServer.verify();
    }

    @ParameterizedTest
    @ValueSource(ints = {1, -1})
    void testNotifyAlertRejectsBusinessErrorDespiteHttpSuccess(int code) {
        MockRestServiceServer mockServer = createMockServer();
        mockServer.expect(requestTo("https://sctapi.ftqq.com/SCT-test-token.send"))
                .andRespond(withSuccess("{\"code\":" + code + ",\"message\":\"request rejected\"}",
                        MediaType.APPLICATION_JSON));

        AlertNoticeException exception = assertThrows(AlertNoticeException.class,
                () -> serverChanAlertNotifyHandler.send(receiver, template, groupAlert));

        assertTrue(exception.getMessage().contains("code " + code));
        mockServer.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "null", "{}", "{\"code\":null}", "{\"errcode\":0}"})
    void testNotifyAlertRejectsMissingSuccessCode(String responseBody) {
        MockRestServiceServer mockServer = createMockServer();
        mockServer.expect(requestTo("https://sctapi.ftqq.com/SCT-test-token.send"))
                .andRespond(withSuccess(responseBody, MediaType.APPLICATION_JSON));

        AlertNoticeException exception = assertThrows(AlertNoticeException.class,
                () -> serverChanAlertNotifyHandler.send(receiver, template, groupAlert));

        assertTrue(exception.getMessage().contains("missing code"));
        mockServer.verify();
    }

    @Test
    void testNotifyAlertRejectsMalformedJson() {
        MockRestServiceServer mockServer = createMockServer();
        mockServer.expect(requestTo("https://sctapi.ftqq.com/SCT-test-token.send"))
                .andRespond(withSuccess("{invalid-json", MediaType.APPLICATION_JSON));

        assertThrows(AlertNoticeException.class,
                () -> serverChanAlertNotifyHandler.send(receiver, template, groupAlert));

        mockServer.verify();
    }

    @Test
    void testNotifyAlertRejectsHttpErrorEvenWithSuccessCode() {
        MockRestServiceServer mockServer = createMockServer();
        mockServer.expect(requestTo("https://sctapi.ftqq.com/SCT-test-token.send"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON).body("{\"code\":0}"));

        assertThrows(AlertNoticeException.class,
                () -> serverChanAlertNotifyHandler.send(receiver, template, groupAlert));

        mockServer.verify();
    }

    @Test
    void testNotifyAlertWrapsTransportFailure() {
        when(restTemplate.postForEntity(any(String.class), any(), eq(CommonRobotNotifyResp.class)))
                .thenThrow(new ResourceAccessException("connection timed out"));

        AlertNoticeException exception = assertThrows(AlertNoticeException.class,
                () -> serverChanAlertNotifyHandler.send(receiver, template, groupAlert));

        assertTrue(exception.getMessage().contains("[ServerChan Notify Error]"));
    }

    private MockRestServiceServer createMockServer() {
        RestTemplate realRestTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(realRestTemplate);
        ReflectionTestUtils.setField(serverChanAlertNotifyHandler, "restTemplate", realRestTemplate);
        return mockServer;
    }
}
