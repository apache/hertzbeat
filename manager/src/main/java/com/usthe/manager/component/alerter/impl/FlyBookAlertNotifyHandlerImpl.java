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

package com.usthe.manager.component.alerter.impl;

import com.usthe.alert.AlerterProperties;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.ResourceBundleUtil;
import com.usthe.manager.component.alerter.AlertNotifyHandler;
import com.usthe.manager.pojo.dto.FlyBookWebHookDto;
import com.usthe.manager.support.exception.AlertNoticeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.ResourceBundle;

/**
 * Send alert information through FeiShu
 * 通过飞书发送告警信息
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class FlyBookAlertNotifyHandlerImpl implements AlertNotifyHandler {

    private final RestTemplate restTemplate;

    private final AlerterProperties alerterProperties;

    private ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        String monitorId = null;
        String monitorName = null;
        if (alert.getTags() != null) {
            monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
        }
        FlyBookWebHookDto flyBookWebHookDto = new FlyBookWebHookDto();
        FlyBookWebHookDto.Content content = new FlyBookWebHookDto.Content();
        FlyBookWebHookDto.Post post = new FlyBookWebHookDto.Post();
        FlyBookWebHookDto.zh_cn zhCn = new FlyBookWebHookDto.zh_cn();
        content.setPost(post);
        post.setZh_cn(zhCn);
        flyBookWebHookDto.setMsg_type("post");
        List<List<FlyBookWebHookDto.FlyBookContent>> contents = new ArrayList<>();
        List<FlyBookWebHookDto.FlyBookContent> contents1 = new ArrayList<>();
        FlyBookWebHookDto.FlyBookContent flyBookContent = new FlyBookWebHookDto.FlyBookContent();
        flyBookContent.setTag("text");
        StringBuilder textBuilder = new StringBuilder(bundle.getString("alerter.notify.target") + " :");
        textBuilder.append(alert.getTarget());
        if (monitorId != null) {
            textBuilder.append("\n").append(bundle.getString("alerter.notify.monitorId"))
                    .append(" :").append(monitorId);
        }
        if (monitorName != null) {
            textBuilder.append("\n").append(bundle.getString("alerter.notify.monitorName"))
                    .append(" :").append(monitorName);
        }
        textBuilder.append("\n").append(bundle.getString("alerter.notify.priority")).append(" :")
            .append(bundle.getString("alerter.priority." + alert.getPriority()));
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String triggerTime = simpleDateFormat.format(new Date(alert.getLastTriggerTime()));
        textBuilder.append("\n").append(bundle.getString("alerter.notify.triggerTime"))
                .append(" : ").append(triggerTime);
        textBuilder.append("\n").append(bundle.getString("alerter.notify.content"))
                .append(" : ").append(alert.getContent());
        flyBookContent.setText(textBuilder.toString());
        contents1.add(flyBookContent);
        FlyBookWebHookDto.FlyBookContent bookContent = new FlyBookWebHookDto.FlyBookContent();
        bookContent.setTag("a");
        bookContent.setText(bundle.getString("alerter.notify.console"));
        bookContent.setHref(alerterProperties.getConsoleUrl());
        contents1.add(bookContent);
        contents.add(contents1);
        zhCn.setTitle("[" + bundle.getString("alerter.notify.title") + "]");
        zhCn.setContent(contents);
        flyBookWebHookDto.setContent(content);
        String webHookUrl = alerterProperties.getFlyBookWebHookUrl() + receiver.getWechatId();
        try {
            ResponseEntity<CommonRobotNotifyResp> entity = restTemplate.postForEntity(webHookUrl,
                    flyBookWebHookDto, CommonRobotNotifyResp.class);
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
