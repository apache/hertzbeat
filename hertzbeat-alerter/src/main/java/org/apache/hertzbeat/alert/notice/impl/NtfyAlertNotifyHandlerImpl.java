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

import java.util.Map;
import java.util.StringJoiner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 * Send alert notification through ntfy push notification service.
 * Supports priority mapping, tags/emoji, click action URL,
 * and optional Bearer token authentication for self-hosted ntfy servers.
 *
 * @see <a href="https://docs.ntfy.sh/publish/">ntfy publish API</a>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NtfyAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    private static final String STATUS_FIRING = "firing";
    private static final String SEVERITY_CRITICAL = "critical";
    private static final String SEVERITY_WARNING = "warning";

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) throws AlertNoticeException {
        try {
            String content = renderContent(noticeTemplate, alert);
            String url = buildNtfyUrl(receiver);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.set("Title", bundle.getString("alerter.notify.title"));
            headers.set("Markdown", "yes");
            headers.set("Priority", String.valueOf(mapPriority(alert)));
            headers.set("Tags", buildTags(alert));

            // Set click action to console URL if available
            if (alerterProperties != null && alerterProperties.getConsoleUrl() != null
                    && !alerterProperties.getConsoleUrl().isEmpty()) {
                headers.set("Click", alerterProperties.getConsoleUrl());
            }

            // Set Bearer token authentication for self-hosted ntfy servers
            String token = receiver.getNtfyToken();
            if (token != null && !token.isEmpty()) {
                headers.set("Authorization", "Bearer " + token);
            }

            HttpEntity<String> httpEntity = new HttpEntity<>(content, headers);
            ResponseEntity<String> responseEntity = restTemplate.postForEntity(url, httpEntity, String.class);
            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                log.debug("Send ntfy notification to {} Success", url);
            } else {
                log.warn("Send ntfy notification to {} Failed: {}", url, responseEntity.getBody());
                throw new AlertNoticeException("Http StatusCode " + responseEntity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[Ntfy Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 15;
    }

    /**
     * Build the ntfy publish URL from receiver configuration.
     */
    private String buildNtfyUrl(NoticeReceiver receiver) {
        String serverUrl = receiver.getNtfyServerUrl();
        if (serverUrl == null || serverUrl.isEmpty()) {
            serverUrl = alerterProperties.getNtfyDefaultServerUrl();
        }
        if (serverUrl.endsWith("/")) {
            serverUrl = serverUrl.substring(0, serverUrl.length() - 1);
        }
        return serverUrl + "/" + receiver.getNtfyTopic();
    }

    /**
     * Map alert severity to ntfy priority level (1-5).
     * <ul>
     *   <li>5 (max) - critical severity while firing</li>
     *   <li>4 (high) - warning severity while firing</li>
     *   <li>3 (default) - info or unknown severity while firing</li>
     *   <li>2 (low) - resolved alerts</li>
     * </ul>
     *
     * @see <a href="https://docs.ntfy.sh/publish/#message-priority">ntfy message priority</a>
     */
    protected int mapPriority(GroupAlert alert) {
        String status = alert.getStatus();
        if (!STATUS_FIRING.equalsIgnoreCase(status)) {
            return 2;
        }

        String severity = extractSeverity(alert);
        if (SEVERITY_CRITICAL.equalsIgnoreCase(severity)) {
            return 5;
        } else if (SEVERITY_WARNING.equalsIgnoreCase(severity)) {
            return 4;
        }
        return 3;
    }

    /**
     * Build ntfy tags string with emoji based on alert status and severity.
     * Tags appear as emoji icons in the notification.
     *
     * @see <a href="https://docs.ntfy.sh/publish/#tags-emojis">ntfy tags &amp; emojis</a>
     */
    protected String buildTags(GroupAlert alert) {
        StringJoiner joiner = new StringJoiner(",");
        String status = alert.getStatus();

        if (STATUS_FIRING.equalsIgnoreCase(status)) {
            String severity = extractSeverity(alert);
            if (SEVERITY_CRITICAL.equalsIgnoreCase(severity)) {
                joiner.add("rotating_light");
                joiner.add("skull");
            } else if (SEVERITY_WARNING.equalsIgnoreCase(severity)) {
                joiner.add("warning");
            } else {
                joiner.add("information_source");
            }
        } else {
            joiner.add("white_check_mark");
        }

        // Append alert name as a plain-text tag if available
        Map<String, String> commonLabels = alert.getCommonLabels();
        if (commonLabels != null && commonLabels.containsKey("alertname")) {
            joiner.add(commonLabels.get("alertname"));
        }

        return joiner.toString();
    }

    /**
     * Extract severity from alert's common labels.
     * Checks "severity" key first, then falls back to "priority".
     */
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
}
