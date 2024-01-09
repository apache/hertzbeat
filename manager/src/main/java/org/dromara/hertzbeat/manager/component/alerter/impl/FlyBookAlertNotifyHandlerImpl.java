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

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.http.*;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Send alert information through FeiShu
 * 通过飞书发送告警信息
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class FlyBookAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
        try {
            FlyBookWebHookDto flyBookWebHookDto = new FlyBookWebHookDto();
            Content content = new Content();
            Post post = new Post();
            ZhCn zhCn = new ZhCn();
            content.setPost(post);
            post.setZhCn(zhCn);
            flyBookWebHookDto.setMsgType("post");
            List<List<FlyBookContent>> contents = new ArrayList<>();
            List<FlyBookContent> contents1 = new ArrayList<>();
            FlyBookContent flyBookContent = new FlyBookContent();
            flyBookContent.setTag("text");
            flyBookContent.setText(renderContent(noticeTemplate, alert));
            contents1.add(flyBookContent);
            FlyBookContent bookContent = new FlyBookContent();
            bookContent.setTag("a");
            bookContent.setText(bundle.getString("alerter.notify.console"));
            bookContent.setHref(alerterProperties.getConsoleUrl());
            contents1.add(bookContent);
            contents.add(contents1);
            zhCn.setTitle("[" + bundle.getString("alerter.notify.title") + "]");
            zhCn.setContent(contents);
            flyBookWebHookDto.setContent(content);
            String webHookUrl = alerterProperties.getFlyBookWebHookUrl() + receiver.getWechatId();
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

    @Data
    private static class FlyBookWebHookDto {
        private static final String MARKDOWN = "post";

        /**
         * 消息类型
         */
        @JsonProperty("msg_type")
        private String msgType = MARKDOWN;

        private Content content;

    }

    /**
     * 消息内容
     */
    @Data
    private static class Content {
        public Post post;
    }

    @Data
    private static class FlyBookContent {
        /**
         * 格式  目前支持文本、超链接、@人的功能  text  a  at
         */
        public String tag;
        /**
         * 文本
         */
        public String text;
        /**
         * 超链接地址
         */
        public String href;

        @JsonProperty("user_id")
        public String userId;

        @JsonProperty("user_name")
        public String userName;
    }

    @Data
    private static class Post {
        @JsonProperty("zh_cn")
        public ZhCn zhCn;
    }

    @Data
    private static class ZhCn {
        /**
         * 标题
         */
        public String title;
        /**
         * 内容
         */
        public List<List<FlyBookContent>> content;
    }

}
