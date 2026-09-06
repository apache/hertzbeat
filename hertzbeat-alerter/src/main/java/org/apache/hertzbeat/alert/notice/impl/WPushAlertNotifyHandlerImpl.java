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
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
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
 * Send alert notification through WPUSH (https://wpush.cn).
 * Success requires HTTP 200 and response JSON {@code code == 0}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WPushAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert)
            throws AlertNoticeException {
        try {
            if (StringUtils.isBlank(receiver.getWpushToken())) {
                throw new AlertNoticeException("WPUSH apikey (wpushToken) is required");
            }
            WPushNotifyDto notifyDto = new WPushNotifyDto();
            notifyDto.setApikey(receiver.getWpushToken());
            notifyDto.setTitle(bundle.getString("alerter.notify.title"));
            notifyDto.setContent(renderContent(noticeTemplate, alert));
            if (StringUtils.isNotBlank(receiver.getWpushChannel())) {
                notifyDto.setChannel(receiver.getWpushChannel());
            }
            if (StringUtils.isNotBlank(receiver.getWpushTopicCode())) {
                notifyDto.setTopicCode(receiver.getWpushTopicCode());
            }
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<WPushNotifyDto> httpEntity = new HttpEntity<>(notifyDto, headers);
            String webHookUrl = alerterProperties.getWpushWebhookUrl();
            ResponseEntity<CommonRobotNotifyResp> responseEntity =
                    restTemplate.postForEntity(webHookUrl, httpEntity, CommonRobotNotifyResp.class);
            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                CommonRobotNotifyResp body = responseEntity.getBody();
                // WPUSH success is defined by JSON code == 0, not HTTP 2xx alone
                if (body != null && body.getCode() != null && body.getCode() == 0) {
                    log.debug("Send WPUSH notification Success");
                } else {
                    String msg = body == null ? "empty response body"
                            : (body.getMsg() != null ? body.getMsg() : "code=" + body.getCode());
                    log.warn("Send WPUSH notification Failed: {}", msg);
                    throw new AlertNoticeException("WPUSH response code not 0: " + msg);
                }
            } else {
                log.warn("Send WPUSH notification Failed: Http StatusCode {}", responseEntity.getStatusCode());
                throw new AlertNoticeException("Http StatusCode " + responseEntity.getStatusCode());
            }
        } catch (AlertNoticeException e) {
            throw e;
        } catch (Exception e) {
            throw new AlertNoticeException("[WPUSH Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 16;
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    protected static class WPushNotifyDto {
        /**
         * WPUSH API key — never log this field in cleartext
         */
        private String apikey;
        private String title;
        private String content;
        private String channel;
        @JsonProperty("topic_code")
        private String topicCode;
    }
}
