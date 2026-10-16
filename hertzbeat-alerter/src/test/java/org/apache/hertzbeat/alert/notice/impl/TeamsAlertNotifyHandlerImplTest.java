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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link TeamsAlertNotifyHandlerImpl}
 */
@ExtendWith(MockitoExtension.class)
class TeamsAlertNotifyHandlerImplTest {

    private static final String TEAMS_URL =
            "https://prod-00.westus.logic.azure.com/workflows/xxx/triggers/manual/paths/invoke?api-version=2016-06-01&sig=abc";

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
        receiver.setTeamsWebHookUrl(TEAMS_URL);

        template = new NoticeTemplate();
        template.setId(1L);
        template.setName("test-template");
        template.setContent("test alert content");

        lenient().when(alerterProperties.getConsoleUrl()).thenReturn("https://console.hertzbeat.com");
        lenient().when(bundle.getString("alerter.notify.title")).thenReturn("HertzBeat Alert");
    }

    @Test
    void testType() {
        assertEquals((byte) 17, teamsHandler.type());
    }

    @Test
    void testSendSuccess() {
        when(restTemplate.postForEntity(any(URI.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("", HttpStatus.ACCEPTED));

        teamsHandler.send(receiver, template, buildGroupAlert("firing", "critical"));

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(uriCaptor.capture(), entityCaptor.capture(), eq(String.class));
        assertEquals(TEAMS_URL, uriCaptor.getValue().toString());
        assertEquals(MediaType.APPLICATION_JSON, entityCaptor.getValue().getHeaders().getContentType());
        TeamsAlertNotifyHandlerImpl.TeamsNotifyDto body =
                (TeamsAlertNotifyHandlerImpl.TeamsNotifyDto) entityCaptor.getValue().getBody();
        assertEquals("message", body.getType());
        assertEquals("application/vnd.microsoft.card.adaptive", body.getAttachments().get(0).getContentType());
        assertEquals("AdaptiveCard", body.getAttachments().get(0).getContent().getType());
    }

    @Test
    void testSendNon2xx() {
        when(restTemplate.postForEntity(any(URI.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("fail", HttpStatus.BAD_REQUEST));

        AlertNoticeException exception = assertThrows(AlertNoticeException.class,
                () -> teamsHandler.send(receiver, template, buildGroupAlert("firing", "warning")));
        assertTrue(exception.getMessage().contains("400"));
    }

    @Test
    void testBlankWebhookRejected() {
        receiver.setTeamsWebHookUrl(" ");
        assertThrows(AlertNoticeException.class,
                () -> teamsHandler.send(receiver, template, buildGroupAlert("firing", "info")));
    }

    @Test
    void testHttpWebhookRejected() {
        receiver.setTeamsWebHookUrl("http://prod-00.westus.logic.azure.com/workflows/xxx");
        assertThrows(AlertNoticeException.class,
                () -> teamsHandler.send(receiver, template, buildGroupAlert("firing", "info")));
    }

    @Test
    void testEncodedQueryIsSentUnchanged() {
        String encodedUrl = "https://prod-00.westus.logic.azure.com/workflows/xxx/triggers/manual/paths/invoke"
                + "?api-version=2016-06-01&sig=abc%2Bdef%2Fxyz%3D";
        receiver.setTeamsWebHookUrl(encodedUrl);
        RestTemplate realTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(realTemplate).build();
        server.expect(request -> assertEquals(encodedUrl, request.getURI().toString()))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess());
        teamsHandler = new TeamsAlertNotifyHandlerImpl();
        ReflectionTestUtils.setField(teamsHandler, "restTemplate", realTemplate);
        ReflectionTestUtils.setField(teamsHandler, "bundle", bundle);
        ReflectionTestUtils.setField(teamsHandler, "alerterProperties", alerterProperties);

        teamsHandler.send(receiver, template, buildGroupAlert("resolved", null));
        server.verify();
    }

    @Test
    void testStatusColorMapping() throws Exception {
        when(restTemplate.postForEntity(any(URI.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("", HttpStatus.OK));

        teamsHandler.send(receiver, template, buildGroupAlert("firing", "critical"));
        assertEquals("Attention", capturedStatusColor());

        teamsHandler.send(receiver, template, buildGroupAlert("firing", "warning"));
        assertEquals("Warning", capturedStatusColor());

        teamsHandler.send(receiver, template, buildGroupAlert("firing", "info"));
        assertEquals("Default", capturedStatusColor());

        teamsHandler.send(receiver, template, buildGroupAlert("resolved", "critical"));
        assertEquals("Good", capturedStatusColor());
    }

    private String capturedStatusColor() {
        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, org.mockito.Mockito.atLeastOnce())
                .postForEntity(any(URI.class), entityCaptor.capture(), eq(String.class));
        TeamsAlertNotifyHandlerImpl.TeamsNotifyDto body =
                (TeamsAlertNotifyHandlerImpl.TeamsNotifyDto) entityCaptor.getValue().getBody();
        TeamsAlertNotifyHandlerImpl.TextBlock status =
                (TeamsAlertNotifyHandlerImpl.TextBlock) body.getAttachments().get(0).getContent().getBody().get(1);
        return status.getColor();
    }

    private GroupAlert buildGroupAlert(String status, String severity) {
        GroupAlert groupAlert = new GroupAlert();
        groupAlert.setStatus(status);
        Map<String, String> labels = new HashMap<>();
        if (severity != null) {
            labels.put("severity", severity);
        }
        groupAlert.setCommonLabels(labels);
        SingleAlert singleAlert = new SingleAlert();
        singleAlert.setLabels(new HashMap<>(labels));
        singleAlert.setContent("cpu high");
        List<SingleAlert> alerts = new ArrayList<>();
        alerts.add(singleAlert);
        groupAlert.setAlerts(alerts);
        return groupAlert;
    }
}
