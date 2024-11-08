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
import java.util.List;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.common.util.StrUtil;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Send alarm information through DingTalk robot
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DingTalkRobotAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
        try {
            DingTalkWebHookDto dingTalkWebHookDto = new DingTalkWebHookDto();
            DingTalkWebHookDto.MarkdownDTO markdownDTO = new DingTalkWebHookDto.MarkdownDTO();
            markdownDTO.setText(renderContent(noticeTemplate, alert));
            markdownDTO.setTitle(bundle.getString("alerter.notify.title"));
            dingTalkWebHookDto.setMarkdown(markdownDTO);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<DingTalkWebHookDto> httpEntity = new HttpEntity<>(dingTalkWebHookDto, headers);
            String webHookUrl = alerterProperties.getDingTalkWebhookUrl() + receiver.getAccessToken();
            ResponseEntity<CommonRobotNotifyResp> responseEntity = restTemplate.postForEntity(webHookUrl,
                    httpEntity, CommonRobotNotifyResp.class);
            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                assert responseEntity.getBody() != null;
                if (responseEntity.getBody().getErrCode() == 0) {
                    log.debug("Send dingTalk webHook: {} Success", webHookUrl);
                    DingTalkWebHookDto dingTalkWebHookTextDto = checkNeedAtNominator(receiver);
                    if (dingTalkWebHookTextDto != null) {
                        HttpEntity<DingTalkWebHookDto> httpEntityText = new HttpEntity<>(dingTalkWebHookTextDto, headers);
                        restTemplate.postForEntity(webHookUrl,
                                httpEntityText, CommonRobotNotifyResp.class);
                    }
                    log.debug("Send dingTalk @ message webHook: {} Success", webHookUrl);
                } else {
                    log.warn("Send dingTalk webHook: {} Failed: {}", webHookUrl, responseEntity.getBody().getErrMsg());
                    throw new AlertNoticeException(responseEntity.getBody().getErrMsg());
                }
            } else {
                log.warn("Send dingTalk webHook: {} Failed: {}", webHookUrl, responseEntity.getBody());
                throw new AlertNoticeException("Http StatusCode " + responseEntity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[DingTalk Notify Error] " + e.getMessage());
        }
    }


    private DingTalkWebHookDto checkNeedAtNominator(NoticeReceiver receiver) {
        if (StringUtils.isBlank(receiver.getPhone()) && StringUtils.isBlank(receiver.getTgUserId())) {
            return null;
        }
        DingTalkWebHookDto dingTalkWebHookDto = new DingTalkWebHookDto();
        dingTalkWebHookDto.setMsgType(DingTalkWebHookDto.TEXT_MSG_TYPE);
        DingTalkWebHookDto.AtDTO atDTO = new DingTalkWebHookDto.AtDTO();
        dingTalkWebHookDto.setAt(atDTO);
        if (StringUtils.isNotBlank(receiver.getPhone())) {
            atDTO.setAtMobiles(StrUtil.analysisArgToList(receiver.getPhone()));
        }
        if (StringUtils.isNotBlank(receiver.getTgUserId())) {
            atDTO.setAtUserIds(StrUtil.analysisArgToList(receiver.getTgUserId()));
        }
        DingTalkWebHookDto.TextDTO textDTO = new DingTalkWebHookDto.TextDTO();
        textDTO.setContent(bundle.getString("alerter.notify.title"));
        dingTalkWebHookDto.setText(textDTO);
        return dingTalkWebHookDto;
    }

    @Override
    public byte type() {
        return 5;
    }

    /**
     * DingTalk robot request body
     * @version 1.0
     */
    @Data
    private static class DingTalkWebHookDto {

        private static final String DEFAULT_MSG_TYPE = "markdown";

        /**
         * text format
         */
        private static final String TEXT_MSG_TYPE = "text";

        /**
         * Message type
         */
        @JsonProperty(value = "msgtype")
        private String msgType = DEFAULT_MSG_TYPE;

        /**
         * markdown message
         */
        private MarkdownDTO markdown;

        /**
         * @ UserId list
         */
        private AtDTO at;

        /**
         * text message
         */
        private TextDTO text;

        @Data
        private static class TextDTO {
            /**
             * Message content
             */
            private String content;

        }

        @Data
        private static class MarkdownDTO {
            /**
             * Message content
             */
            private String text;

            /**
             * Message title
             */
            private String title;
        }


        @Data
        private static class AtDTO {
            /**
             * Message content
             */
            private Boolean isAtAll;

            /**
             * @ UserId list
             */
            private List<String> atUserIds;

            /**
             * @ Mobiles list
             */
            private List<String> atMobiles;

        }

    }



}
