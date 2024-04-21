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
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Gotify alert notify handler
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GotifyAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl{

    /**
     * 发送报警通知
     *
     * @param receiver       Notification configuration information   通知配置信息
     * @param noticeTemplate Notification configuration information   通知配置信息
     * @param alert          Alarm information                        告警信息
     * @throws AlertNoticeException when send receiver error
     */
    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) throws AlertNoticeException {
        try {
            GotifyWebHookDto gotifyWebHookDto = new GotifyWebHookDto();
            gotifyWebHookDto.setTitle(bundle.getString("alerter.notify.title"));
            gotifyWebHookDto.setMessage(renderContent(noticeTemplate, alert));
            GotifyWebHookDto.ClientDisplay clientDisplay = new GotifyWebHookDto.ClientDisplay();
            clientDisplay.setContentType("text/markdown");
            GotifyWebHookDto.Extras extras = new GotifyWebHookDto.Extras();
            extras.setClientDisplay(clientDisplay);
            gotifyWebHookDto.setExtras(extras);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<GotifyWebHookDto> httpEntity = new HttpEntity<>(gotifyWebHookDto, headers);
            String webHookUrl = String.format(alerterProperties.getGotifyWebhookUrl(), receiver.getGotifyToken());
            ResponseEntity<CommonRobotNotifyResp> responseEntity = restTemplate.postForEntity(webHookUrl,
                    httpEntity, CommonRobotNotifyResp.class);
            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                log.debug("Send Gotify webHook: {} Success", webHookUrl);
            } else {
                log.warn("Send Gotify webHook: {} Failed: {}", webHookUrl, responseEntity.getBody());
                throw new AlertNoticeException("Http StatusCode " + responseEntity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[Gotify Notify Error] " + e.getMessage());
        }
    }

    /**
     * 通知类型
     *
     * @return 通知类型
     */
    @Override
    public byte type() {
        return 13;
    }

    @Data
    private static class GotifyWebHookDto {
        private String title;
        private String message;
        private Extras extras;


        @Data
        public static class Extras {
            @JsonProperty("client::display")
            private ClientDisplay clientDisplay;
        }

        @Data
        public static class ClientDisplay {
            private String contentType;
        }


    }
}
