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
 * Send alarm information through WebHookAlter
 */
@Component
@Slf4j
final class WebHookAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        try {
            String hookUrl = receiver.getHookUrl();

            // Validate URL completeness and add debug logging
            if (hookUrl == null || hookUrl.trim().isEmpty()) {
                throw new AlertNoticeException("Webhook URL is null or empty");
            }

            // Check if URL is truncated by detecting common patterns of incomplete URLs
            if (isUrlTruncated(hookUrl)) {
                log.warn("Webhook URL appears to be truncated. Original URL might have been longer than database field limit. URL: {}", hookUrl);
                throw new AlertNoticeException("Webhook URL appears to be truncated - URL may be incomplete");
            }

            // Log complete URL for debugging
            log.debug("Sending webhook to URL: {}", hookUrl);
            log.debug("URL length: {} characters", hookUrl.length());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            //  alert.setContent(escapeJsonStr(alert.getContent()));
            String webhookJson = renderContent(noticeTemplate, alert);
            webhookJson = webhookJson.replace(",\n  }", "\n }");

            HttpEntity<String> alertHttpEntity = new HttpEntity<>(webhookJson, headers);
            ResponseEntity<String> entity = restTemplate.postForEntity(hookUrl, alertHttpEntity, String.class);
            if (entity.getStatusCode().value() < HttpStatus.BAD_REQUEST.value()) {
                log.debug("Send WebHook: {} Success", hookUrl);
            } else {
                log.warn("Send WebHook: {} Failed: {}", hookUrl, entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[WebHook Notify Error] " + e.getMessage());
        }
    }

    /**
     * Detect if a webhook URL appears to be truncated based on common patterns
     * @param url the webhook URL to check
     * @return true if the URL appears to be truncated
     */
    private boolean isUrlTruncated(String url) {
        if (url == null || url.trim().isEmpty()) {
            return false;
        }

        // Check for common truncation patterns in webhook URLs
        String lowerUrl = url.toLowerCase();

        // Pattern 1: URL ends with incomplete query parameters
        if (url.endsWith("&") || url.endsWith("?") || url.endsWith("=")) {
            return true;
        }

        // Pattern 2: Azure Logic Apps URLs missing signature
        if (lowerUrl.contains("logic.azure") && lowerUrl.contains("api-version") && !lowerUrl.contains("sig=")) {
            return true;
        }

        // Pattern 3: AWS API Gateway URLs missing stage or path
        if (lowerUrl.contains("amazonaws.com") && lowerUrl.contains("execute-api")
            && (url.endsWith("/") || url.matches(".*\\.amazonaws\\.com$"))) {
            return true;
        }

        // Pattern 4: Generic webhook services with incomplete paths
        if ((lowerUrl.contains("webhook") || lowerUrl.contains("trigger"))
            && (url.endsWith("/workflows") || url.endsWith("/triggers"))) {
            return true;
        }

        return false;
    }

    @Override
    public byte type() {
        return 2;
    }
}
