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

import com.fasterxml.jackson.annotation.JsonInclude;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Send alert notifications through a Microsoft Teams Workflows webhook as an Adaptive Card.
 * Type 17 is used because type 16 is already assigned to WPUSH.
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class TeamsAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    private static final String TEAMS_HOST_SUFFIX = ".logic.azure.com";
    private static final String TEAMS_HOST = "logic.azure.com";
    private static final String POWER_PLATFORM_HOST_SUFFIX = ".environment.api.powerplatform.com";

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert)
            throws AlertNoticeException {
        try {
            String webhookUrl = receiver.getTeamsWebHookUrl();
            if (StringUtils.isBlank(webhookUrl)) {
                throw new AlertNoticeException("Microsoft Teams webhook URL is required");
            }
            if (!isValidTeamsWebhookUrl(webhookUrl)) {
                throw new AlertNoticeException("Invalid Microsoft Teams Workflows webhook URL");
            }

            TeamsNotifyDto notifyDto = buildAdaptiveCard(noticeTemplate, alert);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<TeamsNotifyDto> httpEntity = new HttpEntity<>(notifyDto, headers);
            // URI keeps an already-encoded signature query intact; a raw String would re-encode it.
            ResponseEntity<String> responseEntity = restTemplate.postForEntity(URI.create(webhookUrl), httpEntity, String.class);
            if (responseEntity.getStatusCode().is2xxSuccessful()) {
                log.debug("Send Microsoft Teams notification Success");
            } else {
                log.warn("Send Microsoft Teams notification Failed: Http StatusCode {}", responseEntity.getStatusCode());
                throw new AlertNoticeException("Http StatusCode " + responseEntity.getStatusCode());
            }
        } catch (AlertNoticeException e) {
            throw e;
        } catch (Exception e) {
            throw new AlertNoticeException("[Microsoft Teams Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 17;
    }

    private TeamsNotifyDto buildAdaptiveCard(NoticeTemplate noticeTemplate, GroupAlert alert) throws Exception {
        String content = renderContent(noticeTemplate, alert);
        String title = bundle.getString("alerter.notify.title");
        String status = alert.getStatus();
        String severity = resolveSeverity(alert);

        List<AdaptiveCardElement> body = new ArrayList<>();
        body.add(textBlock(title, "Bolder", "Medium", null));
        body.add(textBlock("**Status:** " + status, null, null, resolveStatusColor(status, severity)));
        if (StringUtils.isNotBlank(severity)) {
            body.add(textBlock("**Severity:** " + severity, null, null, null));
        }
        body.add(textBlock(content, null, null, null));

        AdaptiveCardContent cardContent = new AdaptiveCardContent();
        cardContent.setSchema("http://adaptivecards.io/schemas/adaptive-card.json");
        cardContent.setType("AdaptiveCard");
        cardContent.setVersion("1.4");
        cardContent.setBody(body);

        Attachment attachment = new Attachment();
        attachment.setContentType("application/vnd.microsoft.card.adaptive");
        attachment.setContent(cardContent);

        TeamsNotifyDto notifyDto = new TeamsNotifyDto();
        notifyDto.setType("message");
        notifyDto.setAttachments(List.of(attachment));
        return notifyDto;
    }

    private TextBlock textBlock(String text, String weight, String size, String color) {
        TextBlock block = new TextBlock();
        block.setType("TextBlock");
        block.setText(text);
        block.setWrap(true);
        block.setWeight(weight);
        block.setSize(size);
        block.setColor(color);
        return block;
    }

    private String resolveSeverity(GroupAlert alert) {
        if (alert.getCommonLabels() != null && alert.getCommonLabels().get("severity") != null) {
            return alert.getCommonLabels().get("severity");
        }
        if (alert.getAlerts() != null) {
            for (SingleAlert singleAlert : alert.getAlerts()) {
                if (singleAlert.getLabels() != null && singleAlert.getLabels().get("severity") != null) {
                    return singleAlert.getLabels().get("severity");
                }
            }
        }
        return null;
    }

    private String resolveStatusColor(String status, String severity) {
        if (!"firing".equalsIgnoreCase(status)) {
            return "Good";
        }
        if ("critical".equalsIgnoreCase(severity)) {
            return "Attention";
        }
        if ("warning".equalsIgnoreCase(severity)) {
            return "Warning";
        }
        return "Default";
    }

    private boolean isValidTeamsWebhookUrl(String url) {
        try {
            URI uri = URI.create(url);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || StringUtils.isBlank(uri.getHost())) {
                return false;
            }
            String host = uri.getHost().toLowerCase();
            return TEAMS_HOST.equals(host) || host.endsWith(TEAMS_HOST_SUFFIX)
                    || (host.length() > POWER_PLATFORM_HOST_SUFFIX.length() && host.endsWith(POWER_PLATFORM_HOST_SUFFIX));
        } catch (Exception e) {
            log.warn("Error validating Microsoft Teams webhook URL");
            return false;
        }
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    static class TeamsNotifyDto {
        private String type;
        private List<Attachment> attachments;
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    static class Attachment {
        private String contentType;
        private AdaptiveCardContent content;
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    static class AdaptiveCardContent {
        @com.fasterxml.jackson.annotation.JsonProperty("$schema")
        private String schema;
        private String type;
        private String version;
        private List<AdaptiveCardElement> body;
    }

    interface AdaptiveCardElement {
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    static class TextBlock implements AdaptiveCardElement {
        private String type;
        private String text;
        private Boolean wrap;
        private String weight;
        private String size;
        private String color;
    }
}
