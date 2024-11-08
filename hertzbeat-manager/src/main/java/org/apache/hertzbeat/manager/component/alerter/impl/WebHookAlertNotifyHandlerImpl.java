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

import java.util.Iterator;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
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
 * Send alarm information through WebHookAlter
 */
@Component
@Slf4j
final class WebHookAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // fix null pointer exception
            filterInvalidTags(alert);
            alert.setContent(escapeJsonStr(alert.getContent()));
            String webhookJson = renderContent(noticeTemplate, alert);
            webhookJson = webhookJson.replace(",\n  }", "\n }");

            HttpEntity<String> alertHttpEntity = new HttpEntity<>(webhookJson, headers);
            ResponseEntity<String> entity = restTemplate.postForEntity(receiver.getHookUrl(), alertHttpEntity, String.class);
            if (entity.getStatusCode().value() < HttpStatus.BAD_REQUEST.value()) {
                log.debug("Send WebHook: {} Success", receiver.getHookUrl());
            } else {
                log.warn("Send WebHook: {} Failed: {}", receiver.getHookUrl(), entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[WebHook Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 2;
    }

    private void filterInvalidTags(Alert alert) {
        if (alert.getTags() == null) {
            return;
        }

        Iterator<Map.Entry<String, String>> iterator = alert.getTags().entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, String> entry = iterator.next();
            if (StringUtils.isNoneBlank(entry.getKey(), entry.getValue())) {
                continue;
            }

            iterator.remove();
        }

        // In order to beautify Freemarker template
        if (alert.getTags().entrySet().size() <= 0L) {
            alert.setTags(null);
        }
    }
}
