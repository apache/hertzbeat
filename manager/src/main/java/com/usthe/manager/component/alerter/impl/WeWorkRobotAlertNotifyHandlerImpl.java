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
import com.usthe.manager.pojo.dto.WeWorkWebHookDto;
import com.usthe.manager.support.exception.AlertNoticeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.ResourceBundle;

/**
 * Send alarm information through enterprise WeChat
 * 通过企业微信发送告警信息
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class WeWorkRobotAlertNotifyHandlerImpl implements AlertNotifyHandler {

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
        WeWorkWebHookDto weWorkWebHookDTO = new WeWorkWebHookDto();
        WeWorkWebHookDto.MarkdownDTO markdownDTO = new WeWorkWebHookDto.MarkdownDTO();
        StringBuilder content = new StringBuilder();
        content.append("<font color=\"info\">[").append(bundle.getString("alerter.notify.title"))
                .append("]</font>\n").append(bundle.getString("alerter.notify.target"))
                .append(" : <font color=\"info\">").append(alert.getTarget()).append("</font>\n");
        if (monitorId != null) {
            content.append(bundle.getString("alerter.notify.monitorId")).append(" : ")
                    .append(monitorId).append("\n");
        }
        if (monitorName != null) {
            content.append(bundle.getString("alerter.notify.monitorName")).append(" : ")
                    .append(monitorName).append("\n");
        }
        if (alert.getPriority() < CommonConstants.ALERT_PRIORITY_CODE_WARNING) {
            content.append(bundle.getString("alerter.notify.priority")).append(" : <font color=\"warning\">")
                    .append(bundle.getString("alerter.priority." + alert.getPriority())).append("</font>\n");
        } else {
            content.append(bundle.getString("alerter.notify.priority")).append(" : <font color=\"comment\">")
                    .append(bundle.getString("alerter.priority." + alert.getPriority())).append("</font>\n");
        }
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String triggerTime = simpleDateFormat.format(new Date(alert.getLastTriggerTime()));
        content.append(bundle.getString("alerter.notify.triggerTime")).append(" : ")
                .append(triggerTime).append("\n");
        content.append(bundle.getString("alerter.notify.content")).append(" : ").append(alert.getContent());
        markdownDTO.setContent(content.toString());
        weWorkWebHookDTO.setMarkdown(markdownDTO);
        String webHookUrl = alerterProperties.getWeWorkWebHookUrl() + receiver.getWechatId();
        try {
            ResponseEntity<CommonRobotNotifyResp> entity = restTemplate.postForEntity(webHookUrl, weWorkWebHookDTO, CommonRobotNotifyResp.class);
            if (entity.getStatusCode() == HttpStatus.OK) {
                assert entity.getBody() != null;
                if (entity.getBody().getErrCode() == 0) {
                    log.debug("Send WeWork webHook: {} Success", webHookUrl);
                } else {
                    log.warn("Send WeWork webHook: {} Failed: {}", webHookUrl, entity.getBody().getErrMsg());
                    throw new AlertNoticeException(entity.getBody().getErrMsg());
                }
            } else {
                log.warn("Send WeWork webHook: {} Failed: {}", webHookUrl, entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[WeWork Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 4;
    }
}
