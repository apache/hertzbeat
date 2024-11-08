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
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link WeComRobotAlertNotifyHandlerImpl}
 */
@Slf4j
class WeComRobotAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private WeComRobotAlertNotifyHandlerImpl weWorkRobotAlertNotifyHandler;

    @Test
    void send() {
        String weWorkKey = System.getenv("WE_WORK_KEY");
        if (StringUtils.isBlank(weWorkKey)) {
            log.warn("Please provide environment variables WE_WORK_KEY");
            return;
        }
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
        receiver.setWechatId(weWorkKey);
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        NoticeTemplate noticeTemplate = new NoticeTemplate();
        noticeTemplate.setId(1L);
        noticeTemplate.setName("WeWork");
        noticeTemplate.setContent("""
                [${title}]
                ${targetLabel} : ${target}
                <#if (monitorId??)>${monitorIdLabel} : ${monitorId} </#if>
                <#if (monitorName??)>${monitorNameLabel} : ${monitorName} </#if>
                <#if (monitorHost??)>${monitorHostLabel} : ${monitorHost} </#if>
                ${priorityLabel} : ${priority}
                ${triggerTimeLabel} : ${triggerTime}
                ${contentLabel} : ${content}""");
        Map<String, String> map = new HashMap<>();
        map.put(CommonConstants.TAG_MONITOR_ID, "Mock monitor id");
        map.put(CommonConstants.TAG_MONITOR_NAME, "Mock monitor name");
        map.put(CommonConstants.TAG_MONITOR_HOST, "Mock monitor host");
        alert.setTags(map);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastAlarmTime(System.currentTimeMillis());

        weWorkRobotAlertNotifyHandler.send(receiver, noticeTemplate, alert);
    }

}
