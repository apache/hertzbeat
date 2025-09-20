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

import java.util.regex.Pattern;

/**
 * Send alarm information through WebHookAlter
 */
@Component
@Slf4j
final class WebHookAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    private static final int TRUNCATION_SUSPECT_LENGTH = 990;
    private static final Pattern INCOMPLETE_ENCODING_PATTERN = Pattern.compile("%[0-9A-Fa-f]?$|%[0-9A-Fa-f]$");
    private static final Pattern BASE64_LIKE_PATTERN = Pattern.compile("[A-Za-z0-9+/=]+");
    private static final Pattern JWT_LIKE_PATTERN = Pattern.compile("[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]*");

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        try {
            String hookUrl = receiver.getHookUrl();

            // Validate URL completeness and add debug logging
            if (StringUtils.isBlank(hookUrl)) {
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
     * Detect if a webhook URL appears to be truncated using generic structural analysis.
     * This method performs conservative checks to avoid false positives:
     * - Only checks for obvious syntax truncation patterns
     * - Avoids flagging legitimate long URLs or tokens
     *
     * @param url the webhook URL to check
     * @return true if the URL appears to be truncated based on structural analysis
     */
    private boolean isUrlTruncated(String url) {
        if (StringUtils.isBlank(url)) {
            return false;
        }

        // 1. Detect syntax-level truncation (most reliable)
        if (hasSyntaxTruncation(url)) {
            return true;
        }

        // 2. Detect parameter-level truncation (conservative)
        if (hasParameterTruncation(url)) {
            return true;
        }

        // 3. Detect encoding truncation (conservative)
        if (hasEncodingTruncation(url)) {
            return true;
        }

        // Note: Removed aggressive length checking to avoid false positives
        // Long URLs are legitimate in many webhook scenarios

        return false;
    }

    /**
     * Check for syntax-level truncation indicators (very conservative)
     */
    private boolean hasSyntaxTruncation(String url) {
        // Only flag URLs ending with query parameter separators (clear syntax errors)
        if (url.endsWith("?") || url.endsWith("&")) {
            return true;
        }

        // Only flag incomplete URL encoding at the very end
        if (url.endsWith("%") || url.matches(".*%[0-9A-Fa-f]$")) {
            return true;
        }

        return false;
    }

    /**
     * Check for parameter-level truncation indicators (very conservative approach)
     */
    private boolean hasParameterTruncation(String url) {
        int queryStart = url.indexOf('?');
        if (queryStart == -1) {
            return false; // No query parameters
        }

        String queryString = url.substring(queryStart + 1);

        // Only flag the most obvious parameter issues
        // Check for multiple consecutive & (like &&& which is clearly wrong)
        if (queryString.contains("&&&")) {
            return true;
        }

        return false;
    }

    /**
     * Check for encoding-specific truncation indicators (conservative approach)
     */
    private boolean hasEncodingTruncation(String url) {
        // Only check JWT-like tokens (which have predictable structure)
        int queryStart = url.indexOf('?');
        if (queryStart > 0) {
            String queryString = url.substring(queryStart + 1);
            String[] params = queryString.split("&");

            for (String param : params) {
                if (param.contains("=")) {
                    String value = param.substring(param.indexOf('=') + 1);

                    // Only check values that actually look like JWT tokens
                    // JWT tokens must have exactly 2 dots and specific structure
                    if (value.contains(".")) {
                        String[] jwtParts = value.split("\\.");

                        // Only flag if it has exactly 2 parts AND looks like a real JWT
                        if (jwtParts.length == 2) {
                            // Additional check: both parts should be reasonably long base64-like strings
                            if (jwtParts[0].length() > 20 && jwtParts[1].length() > 20
                                && jwtParts[0].matches("[A-Za-z0-9_-]+")
                                && jwtParts[1].matches("[A-Za-z0-9_-]+")) {
                                // This looks like a real truncated JWT
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    @Override
    public byte type() {
        return 2;
    }
}
