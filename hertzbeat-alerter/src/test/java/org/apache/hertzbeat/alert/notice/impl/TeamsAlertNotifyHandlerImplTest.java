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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link TeamsAlertNotifyHandlerImpl}
 */
@ExtendWith(MockitoExtension.class)
class TeamsAlertNotifyHandlerImplTest {

    private static final String WORKFLOW_URL = "https://prod-12.westus.logic.azure.com:443/workflows/wf1"
            + "/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=abc_def";

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private AlerterProperties alerterProperties;

    @Mock
    private ResourceBundle bundle;

    @InjectMocks
    private TeamsAlertNotifyHandlerImpl teamsHandler;

    private NoticeReceiver receiver;
    private NoticeTemplate template;

    @BeforeEach
    void setUp() {
        receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("teams-test");
        receiver.setTeamsWebHookUrl(WORKFLOW_URL);

        template = new NoticeTemplate();
        template.setId(1L);
        template.setName("test-template");
        template.setContent("test alert content");

        ReflectionTestUtils.setField(teamsHandler, "bundle", bundle);
        lenient().when(bundle.getString(anyString())).thenReturn("HertzBeat Alert Notify");
        lenient().when(alerterProperties.getConsoleUrl()).thenReturn("https://console.hertzbeat.com");
    }

    @Test
    void testType() {
        assertEquals(16, teamsHandler.type());
    }

    @Test
    void testSendSuccessAccepted() {
        GroupAlert alert = buildGroupAlert("firing", "critical");
        when(restTemplate.postForEntity(any(URI.class), any(), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{}", HttpStatus.ACCEPTED));

        teamsHandler.send(receiver, template, alert);

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).postForEntity(uriCaptor.capture(), any(), eq(String.class));
        assertEquals(URI.create(WORKFLOW_URL), uriCaptor.getValue());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testSendAdaptiveCardPayload() {
        GroupAlert alert = buildGroupAlert("firing", "critical");
        when(restTemplate.postForEntity(any(URI.class), any(), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{}", HttpStatus.OK));

        teamsHandler.send(receiver, template, alert);

        ArgumentCaptor<HttpEntity<Map<String, Object>>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(any(URI.class), entityCaptor.capture(), eq(String.class));
        Map<String, Object> payload = entityCaptor.getValue().getBody();
        assertEquals("message", payload.get("type"));
        List<Map<String, Object>> attachments = (List<Map<String, Object>>) payload.get("attachments");
        Map<String, Object> card = (Map<String, Object>) attachments.get(0).get("content");
        assertEquals("AdaptiveCard", card.get("type"));
        List<Map<String, Object>> body = (List<Map<String, Object>>) card.get("body");
        assertEquals("Attention", body.get(0).get("color"));
        assertTrue(body.stream().anyMatch(block -> "test alert content".equals(block.get("text"))));
    }

    @Test
    void testSendFailureStatus() {
        GroupAlert alert = buildGroupAlert("firing", "warning");
        when(restTemplate.postForEntity(any(URI.class), any(), eq(String.class)))
                .thenReturn(new ResponseEntity<>("error", HttpStatus.INTERNAL_SERVER_ERROR));

        assertThrows(AlertNoticeException.class, () -> teamsHandler.send(receiver, template, alert));
    }

    @Test
    void testSendBlankUrl() {
        receiver.setTeamsWebHookUrl("  ");
        assertThrows(AlertNoticeException.class,
                () -> teamsHandler.send(receiver, template, buildGroupAlert("firing", "info")));
    }

    @Test
    void testSendHttpUrlRejected() {
        receiver.setTeamsWebHookUrl("http://example.com/webhook");
        assertThrows(AlertNoticeException.class,
                () -> teamsHandler.send(receiver, template, buildGroupAlert("firing", "info")));
    }

    @Test
    void testPercentEncodedQuerySentVerbatim() {
        receiver.setTeamsWebHookUrl(WORKFLOW_URL);
        RestTemplate realRestTemplate = new RestTemplate();
        MockRestServiceServer mockServer = MockRestServiceServer.createServer(realRestTemplate);
        mockServer.expect(requestTo(WORKFLOW_URL)).andRespond(withStatus(HttpStatus.ACCEPTED));
        ReflectionTestUtils.setField(teamsHandler, "restTemplate", realRestTemplate);

        teamsHandler.send(receiver, template, buildGroupAlert("firing", "warning"));

        mockServer.verify();
    }

    @Test
    void testResolveAccentColor() {
        assertEquals("Attention", teamsHandler.resolveAccentColor(buildGroupAlert("firing", "critical")));
        assertEquals("Warning", teamsHandler.resolveAccentColor(buildGroupAlert("firing", "warning")));
        assertEquals("Default", teamsHandler.resolveAccentColor(buildGroupAlert("firing", "info")));
        assertEquals("Good", teamsHandler.resolveAccentColor(buildGroupAlert("resolved", "critical")));
    }

    private GroupAlert buildGroupAlert(String status, String severity) {
        GroupAlert groupAlert = new GroupAlert();
        groupAlert.setStatus(status);
        Map<String, String> commonLabels = new HashMap<>();
        if (severity != null) {
            commonLabels.put("severity", severity);
        }
        commonLabels.put("alertname", "Test Alert");
        groupAlert.setCommonLabels(commonLabels);
        groupAlert.setCommonAnnotations(new HashMap<>());
        groupAlert.setGroupLabels(new HashMap<>());

        SingleAlert singleAlert = new SingleAlert();
        singleAlert.setLabels(new HashMap<>());
        singleAlert.setAnnotations(new HashMap<>());
        if (severity != null) {
            singleAlert.getLabels().put("severity", severity);
        }
        List<SingleAlert> alerts = new ArrayList<>();
        alerts.add(singleAlert);
        groupAlert.setAlerts(alerts);
        return groupAlert;
    }
}
