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

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
 * Send alert notification through Bark (https://github.com/Finb/Bark), an iOS push service
 * that also accepts requests from self-hosted servers.
 * Success requires HTTP 200 and response JSON {@code code == 200}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BarkAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    private static final int BARK_SUCCESS_CODE = 200;

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert)
            throws AlertNoticeException {
        try {
            if (StringUtils.isBlank(receiver.getBarkDeviceKey())) {
                throw new AlertNoticeException("Bark device key (barkDeviceKey) is required");
            }
            String serverUrl = StringUtils.defaultIfBlank(receiver.getBarkServerUrl(),
                    alerterProperties.getBarkDefaultServerUrl());
            if (StringUtils.isBlank(serverUrl)) {
                throw new AlertNoticeException("Bark server URL (barkServerUrl) is required");
            }
            BarkNotifyDto notifyDto = new BarkNotifyDto();
            notifyDto.setDeviceKey(receiver.getBarkDeviceKey());
            notifyDto.setTitle(bundle.getString("alerter.notify.title"));
            notifyDto.setBody(renderContent(noticeTemplate, alert));
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<BarkNotifyDto> httpEntity = new HttpEntity<>(notifyDto, headers);
            String pushUrl = StringUtils.removeEnd(serverUrl.trim(), "/") + "/push";
            ResponseEntity<BarkNotifyResp> responseEntity =
                    restTemplate.postForEntity(pushUrl, httpEntity, BarkNotifyResp.class);
            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                BarkNotifyResp body = responseEntity.getBody();
                // Bark reports delivery failures in the body, not through the HTTP status
                if (body != null && body.getCode() != null && body.getCode() == BARK_SUCCESS_CODE) {
                    log.debug("Send Bark notification Success");
                } else {
                    String msg = body == null ? "empty response body"
                            : (body.getMessage() != null ? body.getMessage() : "code=" + body.getCode());
                    log.warn("Send Bark notification Failed: {}", msg);
                    throw new AlertNoticeException("Bark response code not 200: " + msg);
                }
            } else {
                log.warn("Send Bark notification Failed: Http StatusCode {}", responseEntity.getStatusCode());
                throw new AlertNoticeException("Http StatusCode " + responseEntity.getStatusCode());
            }
        } catch (AlertNoticeException e) {
            throw e;
        } catch (Exception e) {
            throw new AlertNoticeException("[Bark Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 17;
    }

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    protected static class BarkNotifyDto {
        /**
         * Bark device key — never log this field in cleartext
         */
        @JsonProperty("device_key")
        private String deviceKey;
        private String title;
        private String body;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    protected static class BarkNotifyResp {
        private Integer code;
        private String message;
    }
}
