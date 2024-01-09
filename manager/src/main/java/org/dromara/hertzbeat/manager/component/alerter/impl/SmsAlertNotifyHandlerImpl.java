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

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.common.service.TencentSmsClient;
import org.dromara.hertzbeat.common.util.ResourceBundleUtil;
import org.dromara.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ResourceBundle;

/**
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty("common.sms.tencent.app-id")
final class SmsAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    private final TencentSmsClient tencentSmsClient;

    private final ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
        // SMS notification 短信通知
        try {
            String monitorName = null;
            if (alert.getTags() != null) {
                monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
            }
            String[] params = new String[3];
            params[0] = monitorName == null ? alert.getTarget() : monitorName;
            params[1] = bundle.getString("alerter.priority." + alert.getPriority());
            params[2] = alert.getContent();
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
