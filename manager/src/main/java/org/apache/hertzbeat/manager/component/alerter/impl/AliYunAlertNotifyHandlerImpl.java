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

import java.util.ResourceBundle;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Send alarm information through Alibaba Cloud SMS
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty("common.sms.aliyun.app-id")
final class AliYunAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    private final ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
        // SMS notification
        try {
            String monitorName = null;
            if (alert.getTags() != null) {
                monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
            }
            String[] params = new String[3];
            params[0] = monitorName == null ? alert.getTarget() : monitorName;
            params[1] = bundle.getString("alerter.priority." + alert.getPriority());
            params[2] = alert.getContent();
            // todo send aliyun sms
        } catch (Exception e) {
            throw new AlertNoticeException("[Sms Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 0;
    }
}
