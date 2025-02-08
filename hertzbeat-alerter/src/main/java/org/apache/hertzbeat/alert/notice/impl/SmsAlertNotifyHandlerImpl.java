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
import org.apache.hertzbeat.alert.service.SmsClient;
import org.apache.hertzbeat.alert.service.SmsClientFactory;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.springframework.stereotype.Component;

/**
 * Send alarm information through Sms
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class SmsAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {
    
    private final SmsClientFactory smsFactory;
    private final ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");
    
    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        try {
            SmsClient smsClient = smsFactory.getSmsClient();
            if (smsClient == null) {
                throw new AlertNoticeException("No SMS Service available, please check the configuration");
            }
            if (!smsClient.checkConfig()) {
                throw new AlertNoticeException(smsClient.getType() + " SMS Service configuration is invalid, please check the configuration");
            }
            smsClient.sendMessage(receiver, noticeTemplate, alert);
        } catch (Exception e) {
            throw new AlertNoticeException("[Sms Notify Error] " + e.getMessage());
        }
    }
    
    @Override
    public byte type() {
        return 0;
    }
}
