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

import java.util.ResourceBundle;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.alert.service.TencentSmsClient;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Send alarm information through Sms
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty("common.sms.tencent.app-id")
@Deprecated
final class SmsAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {
    
    private final TencentSmsClient tencentSmsClient;
    
    private final ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");
    
    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        // SMS notification todo use the rest api not sdk
        try {
            String instance = null;
            String priority = null;
            String content = null;
            if (alert.getCommonLabels() != null) {
                instance = alert.getCommonLabels().get("instance");
                priority = alert.getCommonLabels().get("priority");
                content = alert.getCommonAnnotations().get("summary");
                content = content == null ? alert.getCommonAnnotations().get("description") : content;
                if (content == null) {
                    content = alert.getCommonAnnotations().values().stream().findFirst().orElse(null);
                }
            }
            String[] params = new String[3];
            params[0] = instance == null ? alert.getGroupKey() : instance;
            params[1] = priority == null ? "unknown" : priority;
            params[2] = content;
            tencentSmsClient.sendMessage(params, new String[]{receiver.getPhone()});
        } catch (Exception e) {
            throw new AlertNoticeException("[Sms Notify Error] " + e.getMessage());
        }
    }
    
    @Override
    public byte type() {
        return 0;
    }
}
