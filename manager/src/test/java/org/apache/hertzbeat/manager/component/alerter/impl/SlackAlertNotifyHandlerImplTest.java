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

import jakarta.annotation.Resource;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.util.StringUtils;

/**
 * Test case for {@link SlackAlertNotifyHandlerImpl}
 *
 * @version 2.1
 */
@Slf4j
class SlackAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private SlackAlertNotifyHandlerImpl slackAlertNotifyHandler;

    @Test
    void send() {
        var slackWebHook = System.getenv("SLACK_WEB_HOOK");
        if (!StringUtils.hasText(slackWebHook)) {
            log.warn("Please provide environment variables SLACK_WEB_HOOK");
            return;
        }
        var receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
        receiver.setSlackWebHookUrl(slackWebHook);
        var alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        var noticeTemplate = new NoticeTemplate();
        noticeTemplate.setId(1L);
        noticeTemplate.setName("Slack");
        noticeTemplate.setContent("*[${title}]*\n"
                + "${targetLabel} : ${target}\n"
                + "<#if (monitorId??)>${monitorIdLabel} : ${monitorId} </#if>\n"
                + "<#if (monitorName??)>${monitorNameLabel} : ${monitorName} </#if>\n"
                + "<#if (monitorHost??)>${monitorHostLabel} : ${monitorHost} </#if>\n"
                + "${priorityLabel} : ${priority}\n"
                + "${triggerTimeLabel} : ${triggerTime}\n"
                + "${contentLabel} : ${content}");
        var map = Map.of(
                CommonConstants.TAG_MONITOR_ID, "Mock monitor id",
                CommonConstants.TAG_MONITOR_NAME, "Mock monitor name",
                CommonConstants.TAG_MONITOR_HOST, "Mock monitor host"
        );
        alert.setTags(map);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastAlarmTime(System.currentTimeMillis());

        slackAlertNotifyHandler.send(receiver, noticeTemplate, alert);
    }
}
