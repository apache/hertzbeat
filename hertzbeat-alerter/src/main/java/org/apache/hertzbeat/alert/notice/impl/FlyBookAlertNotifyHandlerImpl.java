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

import java.util.Arrays;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.JsonUtil;
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

    /**
     * Title color corresponding to the alarm priority
     */
    private static final String[] TITLE_COLOR = {"red", "yellow", "orange"};


    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        try {
            String notificationContent = JsonUtil.toJson(renderContent(noticeTemplate, alert));
            // todo priority custom the color 
            String cardMessage = createLarkMessage(receiver.getUserId(), notificationContent, (byte) 1);
            String webHookUrl = alerterProperties.getFlyBookWebhookUrl() + receiver.getAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> flyEntity = new HttpEntity<>(cardMessage, headers);
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

    /**
     * create a lark notification card message
     *
     * @param userId              at user id
     * @param notificationContent notification content
     * @param priority            priority for alert
     * @return message
     */
    private String createLarkMessage(String userId, String notificationContent, byte priority) {
        String larkCardMessage = """
            {
                "msg_type": "interactive",
                "card": {
                    "config": {
                        "update_multi": true
                    },
                    "i18n_elements": {
                        "zh_cn": [
                            {
                                "tag": "column_set",
                                "flex_mode": "none",
                                "horizontal_spacing": "default",
                                "background_style": "default",
                                "columns": [
                                    {
                                        "tag": "column",
                                        "elements": [
                                            {
                                                "tag": "div",
                                                "text": {
                                                    "tag": "plain_text",
                                                    "content": "",
                                                    "text_size": "normal",
                                                    "text_align": "left",
                                                    "text_color": "default"
                                                }
                                            }
                                        ],
                                        "width": "weighted",
                                        "weight": 1
                                    }
                                ]
                            },
                            {
                                "tag": "column_set",
                                "flex_mode": "none",
                                "horizontal_spacing": "default",
                                "background_style": "default",
                                "columns": [
                                    {
                                        "tag": "column",
                                        "elements": [
                                            {
                                                "tag": "div",
                                                "text": {
                                                    "tag": "plain_text",
                                                    "content": %s,
                                                    "text_size": "normal",
                                                    "text_align": "left",
                                                    "text_color": "default"
                                                }
                                            }
                                        ],
                                        "width": "weighted",
                                        "weight": 1
                                    }
                                ]
                            },
                            %s
                            {
                                "tag": "action",
                                "actions": [
                                    {
                                        "tag": "button",
                                        "text": {
                                            "tag": "plain_text",
                                            "content": "登入控制台"
                                        },
                                        "type": "default",
                                        "complex_interaction": true,
                                        "width": "default",
                                        "size": "medium",
                                        "multi_url": {
                                            "url": "%s"
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    "i18n_header": {
                        "zh_cn": {
                            "title": {
                                "tag": "plain_text",
                                "content": "HertzBeat 告警"
                            },
                            "template": "%s"
                        }
                    }
                }
            }
            """;

        String atUserElement = "";
        if (StringUtils.isNotBlank(userId)) {
            String atUserId = Arrays.stream(userId.split(","))
                .map(id -> "<at id=" + id + "></at>")
                .collect(Collectors.joining(" "));
            atUserElement = String.format("""
                {
                    "tag": "div",
                    "text": {
                        "content": "%s",
                        "tag": "lark_md"
                    }
                },
                """, atUserId);
        }
        return String.format(larkCardMessage, notificationContent, atUserElement, alerterProperties.getConsoleUrl(), TITLE_COLOR[priority]);
    }

    @Override
    public byte type() {
        return 6;
    }
}
