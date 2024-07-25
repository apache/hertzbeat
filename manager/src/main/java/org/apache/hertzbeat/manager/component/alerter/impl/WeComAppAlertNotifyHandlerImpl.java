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

package org.apache.hertzbeat.manager.component.alerter.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * WeChat app alert notify impl
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WeComAppAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    /**
     * send weChat app message url
     */
    private static final String APP_MESSAGE_URL = "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=%s";

    /**
     * get access_token url
     */
    private static final String SECRET_URL = "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s";

    /**
     * app message send object
     */
    private static final String DEFAULT_ALL = "@all";

    private final RestTemplate restTemplate;

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) throws AlertNoticeException {
        String corpId = receiver.getCorpId();
        Integer agentId = receiver.getAgentId();
        String appSecret = receiver.getAppSecret();
        String userId = receiver.getUserId();
        String partyId = receiver.getPartyId();
        String tagId = receiver.getTagId();


        try {
            ResponseEntity<WeChatAppReq> entityResponse = restTemplate.getForEntity(String.format(SECRET_URL, corpId, appSecret), WeChatAppReq.class);
            if (Objects.nonNull(entityResponse.getBody())) {
                String accessToken = entityResponse.getBody().getAccessToken();
                WeChatAppDTO.MarkdownDTO markdown = new WeChatAppDTO.MarkdownDTO();
                markdown.setContent(renderContent(noticeTemplate, alert));
                WeChatAppDTO.WeChatAppDTOBuilder weChatAppDTOBuilder = WeChatAppDTO.builder()
                        .msgType(WeChatAppDTO.MARKDOWN)
                        .markdown(markdown)
                        .agentId(agentId);
                boolean hasUserId = receiver.getUserId() != null;
                boolean hasPartyId = receiver.getPartyId() != null;
                boolean hasTagId = receiver.getTagId() != null;

                if (hasUserId) {
                    weChatAppDTOBuilder.toUser(userId);
                }
                if (hasPartyId) {
                    weChatAppDTOBuilder.toParty(partyId);
                }
                if (hasTagId) {
                    weChatAppDTOBuilder.toTag(tagId);
                }

                if (!hasUserId && !hasPartyId && !hasTagId) {
                    weChatAppDTOBuilder.toUser(DEFAULT_ALL);
                }

                WeChatAppDTO weChatAppDTO = weChatAppDTOBuilder.build();

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<WeChatAppDTO> weChatAppEntity = new HttpEntity<>(weChatAppDTO, headers);
                ResponseEntity<WeChatAppReq> response = restTemplate.postForEntity(String.format(APP_MESSAGE_URL, accessToken), weChatAppEntity, WeChatAppReq.class);
                if (Objects.nonNull(response.getBody()) && !Objects.equals(response.getBody().getErrCode(), 0)) {
                    log.warn("Send Enterprise WeChat App Error: {}", response.getBody().getErrMsg());
                    throw new AlertNoticeException("Http StatusCode " + response.getStatusCode() + " Error: " + response.getBody().getErrMsg());
                }
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[Enterprise WeChat Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 10;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    protected static class WeChatAppReq {

        @JsonProperty(value = "errcode")
        private Integer errCode;

        @JsonProperty(value = "errmsg")
        private String errMsg;

        @JsonProperty(value = "access_token")
        private String accessToken;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    protected static class WeChatAppDTO {

        /**
         * markdown format
         */
        public static final String MARKDOWN = "markdown";

        @JsonProperty(value = "touser")
        private String toUser;

        @JsonProperty(value = "toparty")
        private String toParty;

        @JsonProperty(value = "totag")
        private String toTag;

        @JsonProperty(value = "msgtype")
        private String msgType;

        @JsonProperty(value = "agentid")
        private Integer agentId;

        /**
         * text message
         */
        private TextDTO text;

        /**
         * markdown message
         */
        private MarkdownDTO markdown;

        @Data
        protected static class MarkdownDTO {
            /**
             * message content
             */
            private String content;
        }

        @Data
        protected static class TextDTO {
            /**
             * message content
             */
            private String content;
        }

    }
}
