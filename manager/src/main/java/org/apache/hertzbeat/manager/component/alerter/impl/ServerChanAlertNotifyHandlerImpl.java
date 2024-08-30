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
 * Send alarm information through Server
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ServerChanAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {
    /**
     * Send alarm notification
     *
     * @param receiver Notification configuration information
     * @param alert    Alarm information
     * @throws AlertNoticeException when send receiver error
     */
    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) throws AlertNoticeException {
        try {
            ServerChanAlertNotifyHandlerImpl.ServerChanWebHookDto serverChanWebHookDto = new ServerChanAlertNotifyHandlerImpl.ServerChanWebHookDto();
            serverChanWebHookDto.setTitle(bundle.getString("alerter.notify.title"));
            serverChanWebHookDto.setDesp(renderContent(noticeTemplate, alert));
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<ServerChanAlertNotifyHandlerImpl.ServerChanWebHookDto> httpEntity = new HttpEntity<>(serverChanWebHookDto, headers);
            String webHookUrl = String.format(alerterProperties.getServerChanWebhookUrl(), receiver.getServerChanToken());
            ResponseEntity<CommonRobotNotifyResp> responseEntity = restTemplate.postForEntity(webHookUrl,
                    httpEntity, CommonRobotNotifyResp.class);
            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                log.debug("Send ServerChan webHook: {} Success", webHookUrl);
            } else {
                log.warn("Send ServerChan webHook: {} Failed: {}", webHookUrl, responseEntity.getBody());
                throw new AlertNoticeException("Http StatusCode " + responseEntity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[ServerChan Notify Error] " + e.getMessage());
        }
    }

    /**
     * notification type
     *
     * @return notification type
     */
    @Override
    public byte type() {
        return 12;
    }

    @Data
    protected static class ServerChanWebHookDto {
        private static final String MARKDOWN = "markdown";

        /**
         * title
         */
        private String title;

        /**
         * markdown message content
         */
        private String desp;

    }

}
