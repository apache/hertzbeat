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

package org.dromara.hertzbeat.manager.component.alerter.impl;

import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.http.*;
import org.springframework.stereotype.Component;

/**
 * Send alarm information through enterprise WeChat
 * 通过企业微信发送告警信息
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class WeWorkRobotAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
        try {
            WeWorkWebHookDto weWorkWebHookDTO = new WeWorkWebHookDto();
            WeWorkWebHookDto.MarkdownDTO markdownDTO = new WeWorkWebHookDto.MarkdownDTO();
            markdownDTO.setContent(renderContent(noticeTemplate, alert));
            weWorkWebHookDTO.setMarkdown(markdownDTO);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<WeWorkWebHookDto> httpEntity = new HttpEntity<>(weWorkWebHookDTO, headers);
            String webHookUrl = alerterProperties.getWeWorkWebHookUrl() + receiver.getWechatId();
            ResponseEntity<CommonRobotNotifyResp> entity = restTemplate.postForEntity(webHookUrl, httpEntity, CommonRobotNotifyResp.class);
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

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    private static class WeWorkWebHookDto {

        public static final String WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=";
        /**
         * markdown格式
         */
        private static final String MARKDOWN = "markdown";
        /**
         * 文本格式
         */
        private static final String TEXT = "text";

        /**
         * 消息类型
         */
        @Builder.Default
        private String msgtype = MARKDOWN;

        /**
         * markdown消息
         */
        private MarkdownDTO markdown;

        @Data
        private static class MarkdownDTO {
            /**
             * 消息内容
             */
            private String content;
        }

    }
}
