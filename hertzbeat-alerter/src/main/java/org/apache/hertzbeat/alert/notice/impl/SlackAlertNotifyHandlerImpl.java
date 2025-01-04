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

import java.util.Objects;
import lombok.Builder;
import lombok.Data;
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
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Send alarm information by Slack Webhook
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class SlackAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {
    private static final String SUCCESS = "ok";
    private final RestTemplate restTemplate;

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) throws AlertNoticeException {
        try {
            var slackNotify = SlackNotifyDTO.builder()
                    .text(renderContent(noticeTemplate, alert))
                    .build();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<SlackNotifyDTO> slackNotifyEntity = new HttpEntity<>(slackNotify, headers);
            var entity = restTemplate.postForEntity(receiver.getSlackWebHookUrl(), slackNotifyEntity, String.class);
            if (entity.getStatusCode() == HttpStatus.OK && entity.getBody() != null) {
                var body = entity.getBody();
                if (Objects.equals(SUCCESS, body)) {
                    log.debug("Send Slack Success");
                } else {
                    log.warn("Send Slack Failed: {}", body);
                    throw new AlertNoticeException(body);
                }
            } else {
                log.warn("Send Slack Failed {}", entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[Slack Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 8;
    }

    @Data
    @Builder
    private static class SlackNotifyDTO {
        private String text;
    }

}
