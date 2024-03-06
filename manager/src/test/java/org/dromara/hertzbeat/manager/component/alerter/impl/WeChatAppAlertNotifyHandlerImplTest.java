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

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.util.StringUtils;

import jakarta.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

/**
 * unit test case for WeChatAppAlertNotifyHandlerImpl
 *
 * @author hdd
 * @create 2023/04/05
 */
@Slf4j
public class WeChatAppAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {


    @Resource
    private WeWorkAppAlertNotifyHandlerImpl weChatAppAlertNotifyHandler;


    @Test
    public void send() {
        String corpId = System.getenv("CORP_ID");
        String agentId = System.getenv("AGENT_ID");
        String appSecret = System.getenv("APP_SECRET");
        if (!StringUtils.hasText(corpId) || !StringUtils.hasText(agentId) || !StringUtils.hasText(appSecret)) {
            log.warn("Please provide environment variables CORP_ID, TG_USER_ID APP_SECRET");
            return;
        }
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("WeChat App 告警");
        receiver.setCorpId(corpId);
        receiver.setAgentId(Integer.valueOf(agentId));
        receiver.setAppSecret(appSecret);
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        NoticeTemplate noticeTemplate=new NoticeTemplate();
        noticeTemplate.setId(1L);
        noticeTemplate.setName("WeChatApp");
        noticeTemplate.setContent("");
        Map<String, String> map = new HashMap<>();
        map.put(CommonConstants.TAG_MONITOR_ID, "Mock monitor id");
        map.put(CommonConstants.TAG_MONITOR_NAME, "Mock monitor name");
        map.put(CommonConstants.TAG_MONITOR_HOST, "Mock monitor host");
        alert.setTags(map);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastAlarmTime(System.currentTimeMillis());

        weChatAppAlertNotifyHandler.send(receiver, noticeTemplate, alert);
    }


}
