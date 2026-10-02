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

import freemarker.template.TemplateException;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Send alert notification to Microsoft Teams via Workflows (Power Automate) webhook.
 * Office 365 Incoming Webhooks have been retired; this handler posts an Adaptive Card
 * to a Teams Workflows webhook URL and must send the URL through {@link URI} so that
 * pre-encoded query parameters are not corrupted.
 *
 * @see <a href="https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook">
 * Teams webhook documentation</a>
 */
@Component
@Slf4j
final class TeamsAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    private static final String STATUS_FIRING = "firing";
    private static final String SEVERITY_CRITICAL = "critical";
    private static final String SEVERITY_WARNING = "warning";
    private static final String COLOR_ATTENTION = "Attention";
    private static final String COLOR_WARNING = "Warning";
    private static final String COLOR_GOOD = "Good";
    private static final String COLOR_DEFAULT = "Default";
    private static final String HTTPS = "https";

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert)
            throws AlertNoticeException {
        try {
            String webhookUrl = receiver.getTeamsWebHookUrl();
            if (StringUtils.isBlank(webhookUrl)) {
                throw new AlertNoticeException("Teams webhook URL is null or empty");
            }
            URI webhookUri = toHttpsUri(webhookUrl);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> httpEntity =
                    new HttpEntity<>(buildPayload(noticeTemplate, alert), headers);
            ResponseEntity<String> entity = restTemplate.postForEntity(webhookUri, httpEntity, String.class);
            if (entity.getStatusCode().value() < HttpStatus.BAD_REQUEST.value()) {
                log.debug("Send Microsoft Teams: {} Success", webhookUrl);
            } else {
                log.warn("Send Microsoft Teams: {} Failed: {}", webhookUrl, entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (AlertNoticeException e) {
            throw e;
        } catch (Exception e) {
            throw new AlertNoticeException("[Teams Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 16;
    }

    /**
     * Build the Teams Workflows Adaptive Card envelope.
     */
    Map<String, Object> buildPayload(NoticeTemplate noticeTemplate, GroupAlert alert)
            throws TemplateException, IOException {
        String content = renderContent(noticeTemplate, alert);
        String title = bundle.getString("alerter.notify.title");
        String color = resolveAccentColor(alert);

        Map<String, Object> titleBlock = new LinkedHashMap<>();
        titleBlock.put("type", "TextBlock");
        titleBlock.put("text", title);
        titleBlock.put("weight", "Bolder");
        titleBlock.put("size", "Large");
        titleBlock.put("wrap", true);
        titleBlock.put("color", color);

        Map<String, Object> bodyBlock = new LinkedHashMap<>();
        bodyBlock.put("type", "TextBlock");
        bodyBlock.put("text", content);
        bodyBlock.put("wrap", true);

        List<Map<String, Object>> cardBody = new ArrayList<>();
        cardBody.add(titleBlock);
        Map<String, Object> facts = buildFactSet(alert);
        if (facts != null) {
            cardBody.add(facts);
        }
        cardBody.add(bodyBlock);

        Map<String, Object> card = new LinkedHashMap<>();
        card.put("$schema", "http://adaptivecards.io/schemas/adaptive-card.json");
        card.put("type", "AdaptiveCard");
        card.put("version", "1.4");
        card.put("body", cardBody);

        Map<String, Object> attachment = new LinkedHashMap<>();
        attachment.put("contentType", "application/vnd.microsoft.card.adaptive");
        attachment.put("contentUrl", null);
        attachment.put("content", card);

        List<Map<String, Object>> attachments = new ArrayList<>();
        attachments.add(attachment);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "message");
        payload.put("attachments", attachments);
        return payload;
    }

    /**
     * Map alert status and severity to Adaptive Card accent color.
     */
    String resolveAccentColor(GroupAlert alert) {
        if (alert == null || !STATUS_FIRING.equalsIgnoreCase(alert.getStatus())) {
            return COLOR_GOOD;
        }
        String severity = extractSeverity(alert);
        if (SEVERITY_CRITICAL.equalsIgnoreCase(severity)) {
            return COLOR_ATTENTION;
        }
        if (SEVERITY_WARNING.equalsIgnoreCase(severity)) {
            return COLOR_WARNING;
        }
        return COLOR_DEFAULT;
    }

    private Map<String, Object> buildFactSet(GroupAlert alert) {
        if (alert == null) {
            return null;
        }
        List<Map<String, String>> facts = new ArrayList<>();
        if (StringUtils.isNotBlank(alert.getStatus())) {
            facts.add(fact("Status", alert.getStatus()));
        }
        String severity = extractSeverity(alert);
        if (StringUtils.isNotBlank(severity)) {
            facts.add(fact("Severity", severity));
        }
        Map<String, String> commonLabels = alert.getCommonLabels();
        if (commonLabels != null && StringUtils.isNotBlank(commonLabels.get("alertname"))) {
            facts.add(fact("Alert Name", commonLabels.get("alertname")));
        }
        if (facts.isEmpty()) {
            return null;
        }
        Map<String, Object> factSet = new LinkedHashMap<>();
        factSet.put("type", "FactSet");
        factSet.put("facts", facts);
        return factSet;
    }

    private Map<String, String> fact(String name, String value) {
        Map<String, String> fact = new LinkedHashMap<>();
        fact.put("title", name);
        fact.put("value", value);
        return fact;
    }

    private String extractSeverity(GroupAlert alert) {
        Map<String, String> commonLabels = alert.getCommonLabels();
        if (commonLabels == null) {
            return null;
        }
        String severity = commonLabels.get("severity");
        if (severity == null) {
            severity = commonLabels.get("priority");
        }
        return severity;
    }

    private URI toHttpsUri(String webhookUrl) {
        URI uri;
        try {
            uri = URI.create(webhookUrl.trim());
        } catch (IllegalArgumentException e) {
            throw new AlertNoticeException("Invalid Teams webhook URL: " + e.getMessage());
        }
        if (!HTTPS.equalsIgnoreCase(uri.getScheme()) || StringUtils.isBlank(uri.getHost())) {
            throw new AlertNoticeException("Invalid Teams webhook URL");
        }
        return uri;
    }
}
