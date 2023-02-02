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

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.manager.support.exception.AlertNoticeException;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Send alarm information through DingTalk robot
 * 通过钉钉机器人发送告警信息
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DingTalkRobotAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        try {
            DingTalkWebHookDto dingTalkWebHookDto = new DingTalkWebHookDto();
            MarkdownDTO markdownDTO = new MarkdownDTO();
            markdownDTO.setText(renderContent(alert));
            markdownDTO.setTitle(bundle.getString("alerter.notify.title"));
            dingTalkWebHookDto.setMarkdown(markdownDTO);
            String webHookUrl = alerterProperties.getDingTalkWebHookUrl() + receiver.getAccessToken();
            ResponseEntity<CommonRobotNotifyResp> entity = restTemplate.postForEntity(webHookUrl,
                    dingTalkWebHookDto, CommonRobotNotifyResp.class);
            if (entity.getStatusCode() == HttpStatus.OK) {
                assert entity.getBody() != null;
                if (entity.getBody().getErrCode() == 0) {
                    log.debug("Send dingTalk webHook: {} Success", webHookUrl);
                } else {
                    log.warn("Send dingTalk webHook: {} Failed: {}", webHookUrl, entity.getBody().getErrMsg());
                    throw new AlertNoticeException(entity.getBody().getErrMsg());
                }
            } else {
                log.warn("Send dingTalk webHook: {} Failed: {}", webHookUrl, entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[DingTalk Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 5;
    }

    @Override
    protected String templateName() {
        return "alertNotifyDingTalkRobot";
    }

    /**
     * 钉钉机器人请求消息体
     *
     * @author 花城
     * @version 1.0
     * @date 2022/2/21 6:55 下午
     */
    @Data
    private static class DingTalkWebHookDto {
        private static final String MARKDOWN = "markdown";

        /**
         * 消息类型
         */
        private String msgtype = MARKDOWN;

        /**
         * markdown消息
         */
        private MarkdownDTO markdown;

    }

    @Data
    private static class MarkdownDTO {
        /**
         * 消息内容
         */
        private String text;
        /**
         * 消息标题
         */
        private String title;
    }

}
