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

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.common.util.StrUtil;
import org.apache.hertzbeat.manager.pojo.dto.FlyBookWebHookDto;
import org.apache.hertzbeat.manager.pojo.model.CommonRobotNotifyResp;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Send alert information through FeiShu
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class FlyBookAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
        try {
            FlyBookWebHookDto flyBookWebHookDto = new FlyBookWebHookDto();
            flyBookWebHookDto.setMsgType("post");

            FlyBookWebHookDto.Content content = new FlyBookWebHookDto.Content();
            flyBookWebHookDto.setContent(content);

            FlyBookWebHookDto.Post post = new FlyBookWebHookDto.Post();
            content.setPost(post);

            FlyBookWebHookDto.ZhCn zhCn = new FlyBookWebHookDto.ZhCn();
            post.setZhCn(zhCn);

            zhCn.setTitle("[" + bundle.getString("alerter.notify.title") + "]");

            List<FlyBookWebHookDto.FlyBookContent> contentList = new ArrayList<>();

            FlyBookWebHookDto.FlyBookContent textContent = new FlyBookWebHookDto.FlyBookContent();
            textContent.setTag("text");
            textContent.setText(renderContent(noticeTemplate, alert));
            contentList.add(textContent);

            FlyBookWebHookDto.FlyBookContent linkContent = new FlyBookWebHookDto.FlyBookContent();
            linkContent.setTag("a");
            linkContent.setText(bundle.getString("alerter.notify.console"));
            linkContent.setHref(alerterProperties.getConsoleUrl());
            contentList.add(linkContent);

            String userId = receiver.getUserId();
            List<String> userIdList = StrUtil.analysisArgToList(userId);
            if (userIdList != null && !userIdList.isEmpty()) {
                List<FlyBookWebHookDto.FlyBookContent> atContents = userIdList.stream()
                        .map(userID -> {
                            FlyBookWebHookDto.FlyBookContent atContent = new FlyBookWebHookDto.FlyBookContent();
                            atContent.setTag("at");
                            atContent.setUserId(userID);
                            return atContent;
                        })
                        .toList();
                contentList.addAll(atContents);
            }

            List<List<FlyBookWebHookDto.FlyBookContent>> contents = Collections.singletonList(contentList);
            zhCn.setContent(contents);

            String webHookUrl = alerterProperties.getFlyBookWebhookUrl() + receiver.getAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<FlyBookWebHookDto> flyEntity = new HttpEntity<>(flyBookWebHookDto, headers);
            ResponseEntity<CommonRobotNotifyResp> entity = restTemplate.postForEntity(webHookUrl,
                    flyEntity, CommonRobotNotifyResp.class);
            if (entity.getStatusCode() == HttpStatus.OK) {
                assert entity.getBody() != null;
                if (entity.getBody().getCode() == null || entity.getBody().getCode() == 0) {
                    log.debug("Send feiShu webHook: {} Success", webHookUrl);
                } else {
                    log.warn("Send feiShu webHook: {} Failed: {}", webHookUrl, entity.getBody().getMsg());
                    throw new AlertNoticeException(entity.getBody().getMsg());
                }
            } else {
                log.warn("Send feiShu webHook: {} Failed: {}", webHookUrl, entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[FeiShu Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 6;
    }

}
