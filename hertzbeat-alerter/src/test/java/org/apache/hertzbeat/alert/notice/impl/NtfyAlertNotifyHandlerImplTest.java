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
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link NtfyAlertNotifyHandlerImpl}
 */
@ExtendWith(MockitoExtension.class)
class NtfyAlertNotifyHandlerImplTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private AlerterProperties alerterProperties;

    @Mock
    private ResourceBundle bundle;

    @InjectMocks
    private NtfyAlertNotifyHandlerImpl ntfyHandler;

    private NoticeReceiver receiver;
    private NoticeTemplate template;

    @BeforeEach
    public void setUp() {
        receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("ntfy-test");
        receiver.setNtfyServerUrl("https://ntfy.example.com");
        receiver.setNtfyTopic("hertzbeat-alerts");

        template = new NoticeTemplate();
        template.setId(1L);
        template.setName("test-template");
        template.setContent("test alert content");

        lenient().when(alerterProperties.getNtfyDefaultServerUrl()).thenReturn("https://ntfy.sh");
        lenient().when(alerterProperties.getConsoleUrl()).thenReturn("https://console.hertzbeat.com");
        lenient().when(bundle.getString("alerter.notify.title")).thenReturn("HertzBeat Alert");
    }

    @Test
    void testType() {
        assertEquals(15, ntfyHandler.type());
    }

    @Test
    void testSendSuccess() {
        GroupAlert alert = buildGroupAlert("firing", "critical");

        ResponseEntity<String> responseEntity = new ResponseEntity<>("{\"id\":\"abc123\"}", HttpStatus.OK);
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(responseEntity);

        ntfyHandler.send(receiver, template, alert);

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        verify(restTemplate).postForEntity(urlCaptor.capture(), any(HttpEntity.class), eq(String.class));
        assertEquals("https://ntfy.example.com/hertzbeat-alerts", urlCaptor.getValue());
    }

    @Test
    void testSendWithAuthToken() {
        receiver.setNtfyToken("tk_testtoken123");
        GroupAlert alert = buildGroupAlert("firing", "warning");

        ResponseEntity<String> responseEntity = new ResponseEntity<>("{}", HttpStatus.OK);
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(responseEntity);

        ntfyHandler.send(receiver, template, alert);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(anyString(), entityCaptor.capture(), eq(String.class));
        assertEquals("Bearer tk_testtoken123", entityCaptor.getValue().getHeaders().getFirst("Authorization"));
    }

    @Test
    void testSendUsesDefaultServerWhenEmpty() {
        receiver.setNtfyServerUrl("");
        GroupAlert alert = buildGroupAlert("firing", "info");

        ResponseEntity<String> responseEntity = new ResponseEntity<>("{}", HttpStatus.OK);
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(responseEntity);

        ntfyHandler.send(receiver, template, alert);

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        verify(restTemplate).postForEntity(urlCaptor.capture(), any(HttpEntity.class), eq(String.class));
        assertEquals("https://ntfy.sh/hertzbeat-alerts", urlCaptor.getValue());
    }

    @Test
    void testSendFailure() {
        GroupAlert alert = buildGroupAlert("firing", "critical");

        ResponseEntity<String> responseEntity = new ResponseEntity<>("error", HttpStatus.INTERNAL_SERVER_ERROR);
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(responseEntity);

        assertThrows(AlertNoticeException.class, () -> ntfyHandler.send(receiver, template, alert));
    }

    @Test
    void testSendNetworkError() {
        GroupAlert alert = buildGroupAlert("firing", "warning");

        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new org.springframework.web.client.ResourceAccessException("Connection refused"));

        assertThrows(AlertNoticeException.class, () -> ntfyHandler.send(receiver, template, alert));
    }

    @Test
    void testMapPriorityCriticalFiring() {
        GroupAlert alert = buildGroupAlert("firing", "critical");
        assertEquals(5, ntfyHandler.mapPriority(alert));
    }

    @Test
    void testMapPriorityWarningFiring() {
        GroupAlert alert = buildGroupAlert("firing", "warning");
        assertEquals(4, ntfyHandler.mapPriority(alert));
    }

    @Test
    void testMapPriorityInfoFiring() {
        GroupAlert alert = buildGroupAlert("firing", "info");
        assertEquals(3, ntfyHandler.mapPriority(alert));
    }

    @Test
    void testMapPriorityResolved() {
        GroupAlert alert = buildGroupAlert("resolved", "critical");
        assertEquals(2, ntfyHandler.mapPriority(alert));
    }

    @Test
    void testMapPriorityUnknownSeverity() {
        GroupAlert alert = buildGroupAlert("firing", null);
        assertEquals(3, ntfyHandler.mapPriority(alert));
    }

    @Test
    void testBuildTagsCriticalFiring() {
        GroupAlert alert = buildGroupAlert("firing", "critical");
        String tags = ntfyHandler.buildTags(alert);
        assertTrue(tags.contains("rotating_light"));
        assertTrue(tags.contains("skull"));
    }

    @Test
    void testBuildTagsWarningFiring() {
        GroupAlert alert = buildGroupAlert("firing", "warning");
        String tags = ntfyHandler.buildTags(alert);
        assertTrue(tags.contains("warning"));
    }

    @Test
    void testBuildTagsResolved() {
        GroupAlert alert = buildGroupAlert("resolved", "critical");
        String tags = ntfyHandler.buildTags(alert);
        assertTrue(tags.contains("white_check_mark"));
    }

    @Test
    void testBuildTagsIncludesAlertName() {
        GroupAlert alert = buildGroupAlert("firing", "warning");
        alert.getCommonLabels().put("alertname", "HighCPU");
        String tags = ntfyHandler.buildTags(alert);
        assertTrue(tags.contains("HighCPU"));
    }

    @Test
    void testSendHeadersContainPriorityAndTags() {
        GroupAlert alert = buildGroupAlert("firing", "critical");

        ResponseEntity<String> responseEntity = new ResponseEntity<>("{}", HttpStatus.OK);
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(responseEntity);

        ntfyHandler.send(receiver, template, alert);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(anyString(), entityCaptor.capture(), eq(String.class));

        HttpEntity<String> captured = entityCaptor.getValue();
        assertEquals("5", captured.getHeaders().getFirst("Priority"));
        assertEquals("yes", captured.getHeaders().getFirst("Markdown"));
        assertEquals("https://console.hertzbeat.com", captured.getHeaders().getFirst("Click"));
        assertTrue(captured.getHeaders().getFirst("Tags").contains("rotating_light"));
    }

    @Test
    void testServerUrlTrailingSlashRemoved() {
        receiver.setNtfyServerUrl("https://ntfy.example.com/");
        GroupAlert alert = buildGroupAlert("firing", "info");

        ResponseEntity<String> responseEntity = new ResponseEntity<>("{}", HttpStatus.OK);
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(responseEntity);

        ntfyHandler.send(receiver, template, alert);

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        verify(restTemplate).postForEntity(urlCaptor.capture(), any(HttpEntity.class), eq(String.class));
        assertEquals("https://ntfy.example.com/hertzbeat-alerts", urlCaptor.getValue());
    }

    private GroupAlert buildGroupAlert(String status, String severity) {
        GroupAlert groupAlert = new GroupAlert();
        groupAlert.setStatus(status);

        Map<String, String> commonLabels = new HashMap<>();
        if (severity != null) {
            commonLabels.put("severity", severity);
        }
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
