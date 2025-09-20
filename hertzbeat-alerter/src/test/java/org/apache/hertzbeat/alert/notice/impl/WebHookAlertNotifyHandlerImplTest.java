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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
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

/**
 * Test case for WebHook Alert Notify
 */
@ExtendWith(MockitoExtension.class)
class WebHookAlertNotifyHandlerImplTest {

    @Mock
    private RestTemplate restTemplate;
    
    @Mock
    private ResourceBundle bundle;
    
    @InjectMocks
    private WebHookAlertNotifyHandlerImpl webHookAlertNotifyHandler;

    private NoticeReceiver receiver;
    private GroupAlert groupAlert;
    private NoticeTemplate template;

    @BeforeEach
    public void setUp() {
        receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");
        receiver.setHookUrl("http://test.webhook.url");
        
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
    }

    @Test
    public void testNotifyAlertSuccess() {
        ResponseEntity<String> responseEntity = 
            new ResponseEntity<>("null", HttpStatus.OK);
        
        when(restTemplate.postForEntity(any(String.class), any(), eq(String.class))).thenReturn(responseEntity);
        
        webHookAlertNotifyHandler.send(receiver, template, groupAlert);
    }

    @Test
    public void testNotifyAlertFailure() {
        ResponseEntity<String> responseEntity =
                new ResponseEntity<>("null", HttpStatus.INTERNAL_SERVER_ERROR);

        when(restTemplate.postForEntity(any(String.class), any(), eq(String.class))).thenReturn(responseEntity);


        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertWithQueryParametersSuccess() {
        receiver.setHookUrl("https://prod-12.chinaeast2.logic.azure.cn:443/workflows/test/triggers/manual/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=testSignature123");

        ResponseEntity<String> responseEntity =
            new ResponseEntity<>("null", HttpStatus.OK);

        when(restTemplate.postForEntity(eq(receiver.getHookUrl()), any(), eq(String.class))).thenReturn(responseEntity);

        webHookAlertNotifyHandler.send(receiver, template, groupAlert);
    }

    @Test
    public void testNotifyAlertWithTruncatedUrlFailure() {
        // Test syntax truncation - URL ending with query separators
        receiver.setHookUrl("https://example.com/webhook?param=");
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));

        receiver.setHookUrl("https://example.com/webhook?");
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));

        receiver.setHookUrl("https://example.com/webhook&");
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertWithTruncatedUrlPatterns() {
        // Test incomplete URL encoding
        receiver.setHookUrl("https://example.com/webhook?data=hello%2");
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));

        // Test parameter truncation - empty parameter
        receiver.setHookUrl("https://example.com/webhook?param1=value1&&param2=value2");
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));

        // Test truncated JWT token (only 2 parts instead of 3)
        receiver.setHookUrl("https://example.com/webhook?jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0");
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertWithValidUrlPatterns() {
        ResponseEntity<String> responseEntity =
            new ResponseEntity<>("null", HttpStatus.OK);

        when(restTemplate.postForEntity(any(String.class), any(), eq(String.class))).thenReturn(responseEntity);

        // Test complete URLs that should pass validation
        receiver.setHookUrl("https://hooks.slack.com/services/T123/B456/complete-token");
        webHookAlertNotifyHandler.send(receiver, template, groupAlert);

        receiver.setHookUrl("https://discord.com/api/webhooks/123456789/complete-token");
        webHookAlertNotifyHandler.send(receiver, template, groupAlert);

        receiver.setHookUrl("https://example.com/webhook?complete=true&valid=yes");
        webHookAlertNotifyHandler.send(receiver, template, groupAlert);

        // Test valid Base64 token (multiple of 4)
        receiver.setHookUrl("https://example.com/webhook?token=YWJjZGVmZ2hpams=");
        webHookAlertNotifyHandler.send(receiver, template, groupAlert);

        // Test valid JWT token (3 complete parts)
        receiver.setHookUrl("https://example.com/webhook?jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123");
        webHookAlertNotifyHandler.send(receiver, template, groupAlert);
    }

    @Test
    public void testNotifyAlertWithLengthAnomalies() {
        // Test URL with extreme length (near 1000 limit) AND clear truncation pattern
        StringBuilder truncatedUrl = new StringBuilder("https://api.example.com/webhook?token=");

        // Add a very long token that looks truncated (no proper ending)
        for (int i = 0; i < 950; i++) {
            truncatedUrl.append("x");
        }
        // Make sure it's at the extreme length limit
        while (truncatedUrl.length() < 998) {
            truncatedUrl.append("x");
        }

        receiver.setHookUrl(truncatedUrl.toString());
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertWithExtremeLongButCompleteUrl() {
        // Test extremely long but structurally complete URL should work
        StringBuilder longCompleteUrl = new StringBuilder("https://api.example.com/webhook?");
        longCompleteUrl.append("api-version=2016-10-01&");
        longCompleteUrl.append("sp=%2Ftriggers%2Fmanual%2Frun&");
        longCompleteUrl.append("sv=1.0&");
        longCompleteUrl.append("sig=");

        // Add a very long but valid-looking signature
        for (int i = 0; i < 150; i++) {
            longCompleteUrl.append("a");
        }

        ResponseEntity<String> responseEntity =
            new ResponseEntity<>("null", HttpStatus.OK);

        when(restTemplate.postForEntity(eq(longCompleteUrl.toString()), any(), eq(String.class))).thenReturn(responseEntity);

        receiver.setHookUrl(longCompleteUrl.toString());
        // Should not throw exception for complete long URLs
        webHookAlertNotifyHandler.send(receiver, template, groupAlert);
    }

    @Test
    public void testNotifyAlertWithNullOrEmptyUrl() {
        // Test null URL
        receiver.setHookUrl(null);
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));

        // Test empty URL
        receiver.setHookUrl("");
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));

        // Test blank URL
        receiver.setHookUrl("   ");
        assertThrows(AlertNoticeException.class,
                () -> webHookAlertNotifyHandler.send(receiver, template, groupAlert));
    }

    @Test
    public void testNotifyAlertWithLongUrlSuccess() {
        StringBuilder longUrl = new StringBuilder("https://prod-12.chinaeast2.logic.azure.cn:443/workflows/test/triggers/manual/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=");
        for (int i = 0; i < 200; i++) {
            longUrl.append("x");
        }
        receiver.setHookUrl(longUrl.toString());

        ResponseEntity<String> responseEntity =
            new ResponseEntity<>("null", HttpStatus.OK);

        when(restTemplate.postForEntity(eq(receiver.getHookUrl()), any(), eq(String.class))).thenReturn(responseEntity);

        webHookAlertNotifyHandler.send(receiver, template, groupAlert);

        assertTrue(receiver.getHookUrl().length() > 300);
    }
}
