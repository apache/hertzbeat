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

import com.fasterxml.jackson.annotation.JsonProperty;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.StrUtil;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Send alarm information through enterprise WeChat
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class WeComRobotAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    private static final int MAX_MARKDOWN_BYTES = 4096;

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        try {
            String content = renderContent(noticeTemplate, alert);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String wechatId = receiver.getWechatId();
            if (!isValidWechatId(wechatId)) {
                log.warn("Invalid WeChat ID: {}", wechatId);
                throw new AlertNoticeException("Invalid WeChat ID provided.");
            }
            String webHookUrl = alerterProperties.getWeWorkWebhookUrl() + wechatId;
            for (String part : splitMarkdown(content)) {
                WeWorkWebHookDto request = new WeWorkWebHookDto();
                WeWorkWebHookDto.MarkdownDTO markdown = new WeWorkWebHookDto.MarkdownDTO();
                markdown.setContent(part);
                request.setMarkdown(markdown);
                ResponseEntity<CommonRobotNotifyResp> entity = restTemplate.postForEntity(
                        webHookUrl, new HttpEntity<>(request, headers), CommonRobotNotifyResp.class);
                if (entity.getStatusCode() != HttpStatus.OK) {
                    throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
                }
                CommonRobotNotifyResp body = entity.getBody();
                if (body == null) {
                    throw new AlertNoticeException("Empty WeWork webhook response");
                }
                if (body.getErrCode() != 0) {
                    log.warn("Send WeWork webhook failed with code {}", body.getErrCode());
                    throw new AlertNoticeException(body.getErrMsg());
                }
            }
            log.debug("Send WeWork webhook success");
            WeWorkWebHookDto mention = checkNeedAtNominator(receiver, alert);
            if (!Objects.isNull(mention)) {
                restTemplate.postForEntity(webHookUrl, new HttpEntity<>(mention, headers), CommonRobotNotifyResp.class);
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[WeWork Notify Error] " + e.getMessage());
        }
    }

    /** Split at line boundaries when possible, without cutting a UTF-8 code point. */
    static List<String> splitMarkdown(String content) {
        List<String> parts = new ArrayList<>();
        int start = 0;
        while (start < content.length()) {
            int end = start;
            int lastLineEnd = -1;
            int bytes = 0;
            while (end < content.length()) {
                int codePoint = content.codePointAt(end);
                int next = end + Character.charCount(codePoint);
                int size = content.substring(end, next).getBytes(StandardCharsets.UTF_8).length;
                if (bytes + size > MAX_MARKDOWN_BYTES) {
                    break;
                }
                bytes += size;
                end = next;
                if (codePoint == '\n') {
                    lastLineEnd = end;
                }
            }
            if (end < content.length() && lastLineEnd > start) {
                end = lastLineEnd;
            }
            parts.add(content.substring(start, end));
            start = end;
        }
        if (parts.isEmpty()) {
            parts.add(content);
        }
        return parts;
    }

    private WeWorkWebHookDto checkNeedAtNominator(NoticeReceiver receiver, GroupAlert alert) {
        if (StringUtils.isBlank(receiver.getPhone()) && StringUtils.isBlank(receiver.getUserId())) {
            return null;
        }
        WeWorkWebHookDto weWorkWebHookTextDto = new WeWorkWebHookDto();
        weWorkWebHookTextDto.setMsgtype(WeWorkWebHookDto.TEXT_MSG_TYPE);
        WeWorkWebHookDto.TextDTO textDto = new WeWorkWebHookDto.TextDTO();
        if (StringUtils.isNotBlank(receiver.getPhone())) {
            textDto.setMentionedMobileList(StrUtil.analysisArgToList(receiver.getPhone()));
            weWorkWebHookTextDto.setText(textDto);
        }
        if (StringUtils.isNotBlank(receiver.getUserId())) {
            textDto.setMentionedList(StrUtil.analysisArgToList(receiver.getUserId()));
            weWorkWebHookTextDto.setText(textDto);
        }
        return weWorkWebHookTextDto;

    }


    @Override
    public byte type() {
        return 4;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    private static class WeWorkWebHookDto {

        public static final String WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=";

        /**
         * default msg type : markdown format
         */
        private static final String DEFAULT_MSG_TYPE = "markdown";

        /**
         * text format
         */
        private static final String TEXT_MSG_TYPE = "text";

        /**
         * message type
         */
        @Builder.Default
        private String msgtype = DEFAULT_MSG_TYPE;

        /**
         * markdown message
         */
        private MarkdownDTO markdown;

        /**
         * text message
         */
        private TextDTO text;

        @Data
        private static class MarkdownDTO {

            /**
             * message content
             */
            private String content;
        }

        @Data
        private static class TextDTO {

            /**
             * message content
             */
            private String content;
            /**
             * @ userId
             */
            @JsonProperty(value = "mentioned_list")
            private List<String> mentionedList;
            /**
             * @ phone
             */
            @JsonProperty(value = "mentioned_mobile_list")
            private List<String> mentionedMobileList;
        }

    }
    
    /**
     * Validate the WeChat ID to ensure it meets the expected format.
     *
     * @param wechatId the WeChat ID to validate
     * @return true if valid, false otherwise
     */
    private boolean isValidWechatId(String wechatId) {
        // Example validation: ensure the ID is alphanumeric and non-empty
        return StringUtils.isNotBlank(wechatId) && wechatId.matches("^[a-zA-Z0-9_-]+$");
    }
}
