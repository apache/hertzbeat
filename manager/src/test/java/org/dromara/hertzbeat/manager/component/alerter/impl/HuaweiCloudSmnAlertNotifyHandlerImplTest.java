/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.dromara.hertzbeat.manager.component.alerter.impl;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.util.StringUtils;

import jakarta.annotation.Resource;
import java.util.Map;

/**
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * Created by gcdd1993 on 2023/4/22
 */
@Slf4j
class HuaweiCloudSmnAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private HuaweiCloudSmnAlertNotifyHandlerImpl huaweiyunSmnAlertNotifyHandler;

    @Test
    void send() throws InterruptedException {
        var smnProjectId = System.getenv("SMN_PROJECT_ID");
        if (!StringUtils.hasText(smnProjectId)) {
            log.warn("Please provide environment variables SMN_PROJECT_ID");
            return;
        }
        var smnAk = System.getenv("SMN_AK");
        if (!StringUtils.hasText(smnAk)) {
            log.warn("Please provide environment variables SMN_AK");
            return;
        }
        var smnSk = System.getenv("SMN_SK");
        if (!StringUtils.hasText(smnSk)) {
            log.warn("Please provide environment variables SMN_SK");
            return;
        }
        var smnRegion = System.getenv("SMN_REGION");
        if (!StringUtils.hasText(smnRegion)) {
            log.warn("Please provide environment variables SMN_REGION");
            return;
        }
        var smnTopicUrn = System.getenv("SMN_TOPIC_URN");
        if (!StringUtils.hasText(smnTopicUrn)) {
            log.warn("Please provide environment variables SMN_TOPIC_URN");
            return;
        }
        var receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
        receiver.setSmnAk(smnAk);
        receiver.setSmnSk(smnSk);
        receiver.setSmnProjectId(smnProjectId);
        receiver.setSmnRegion(smnRegion);
        receiver.setSmnTopicUrn(smnTopicUrn);
        var noticeTemplate=new NoticeTemplate();
        noticeTemplate.setId(1L);
        noticeTemplate.setName("HuaWeiCloud");
        noticeTemplate.setContent("[${title}]\n" +
                "${targetLabel} : ${target}\n" +
                "<#if (monitorId??)>${monitorIdLabel} : ${monitorId} </#if>\n" +
                "<#if (monitorName??)>${monitorNameLabel} : ${monitorName} </#if>\n" +
                "<#if (monitorHost??)>${monitorHostLabel} : ${monitorHost} </#if>\n" +
                "${priorityLabel} : ${priority}\n" +
                "${triggerTimeLabel} : ${triggerTime}\n" +
                "${contentLabel} : ${content}");
        var alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        var map = Map.of(
                CommonConstants.TAG_MONITOR_ID, "Mock monitor id",
                CommonConstants.TAG_MONITOR_NAME, "Mock monitor name",
                CommonConstants.TAG_MONITOR_HOST, "Mock monitor host"
        );
        alert.setTags(map);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastAlarmTime(System.currentTimeMillis());

        huaweiyunSmnAlertNotifyHandler.send(receiver, noticeTemplate,alert);
    }
}
