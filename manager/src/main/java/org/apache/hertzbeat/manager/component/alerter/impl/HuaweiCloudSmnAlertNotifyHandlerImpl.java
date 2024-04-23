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

import com.huaweicloud.sdk.core.auth.BasicCredentials;
import com.huaweicloud.sdk.smn.v2.SmnClient;
import com.huaweicloud.sdk.smn.v2.model.PublishMessageRequest;
import com.huaweicloud.sdk.smn.v2.model.PublishMessageRequestBody;
import com.huaweicloud.sdk.smn.v2.region.SmnRegion;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.stereotype.Component;

/**
 * Send alarm information through Huawei CloudSmn
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class HuaweiCloudSmnAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {
    private final ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    private final Map<String, SmnClient> smnClientMap = new ConcurrentHashMap<>();

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
        try {
            var smnClient = getSmnClient(receiver);
            var request = new PublishMessageRequest()
                    .withTopicUrn(receiver.getSmnTopicUrn());
            var body = new PublishMessageRequestBody()
                    .withSubject(bundle.getString("alerter.notify.title"))
                    .withMessage(renderContent(noticeTemplate, alert));
            request.withBody(body);
            var response = smnClient.publishMessage(request);
            log.debug("huaweiCloud smn alert response: {}", response);
        } catch (Exception e) {
            throw new AlertNoticeException("[Huawei Cloud Smn Notify Error] " + e.getMessage());
        }
    }

    private SmnClient getSmnClient(NoticeReceiver receiver) {
        var key = receiver.getSmnProjectId() + receiver.getSmnAk() + receiver.getSmnSk() + receiver.getSmnRegion();
        if (smnClientMap.containsKey(key)) {
            return smnClientMap.get(key);
        }
        var auth = new BasicCredentials()
                .withProjectId(receiver.getSmnProjectId())
                .withAk(receiver.getSmnAk())
                .withSk(receiver.getSmnSk());

        var smnAsyncClient = SmnClient.newBuilder()
                .withCredential(auth)
                .withRegion(SmnRegion.valueOf(receiver.getSmnRegion()))
                .build();
        smnClientMap.put(key, smnAsyncClient);
        return smnAsyncClient;
    }

    @Override
    public byte type() {
        return 11;
    }
}
