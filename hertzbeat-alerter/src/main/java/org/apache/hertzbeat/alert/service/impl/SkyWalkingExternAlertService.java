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

package org.apache.hertzbeat.alert.service.impl;

import org.apache.hertzbeat.alert.dto.SkyWalkingExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import tools.jackson.core.type.TypeReference;

/**
 * SkyWalking external alarm service impl
 */
@Service
public class SkyWalkingExternAlertService implements ExternAlertService {

    @Autowired
    private AlarmCommonReduce alarmCommonReduce;


    @Override
    public void addExternAlert(String workspaceId, String content) {
        TypeReference<List<SkyWalkingExternAlert>> typeReference = new TypeReference<>() {};
        List<SkyWalkingExternAlert> alerts = JsonUtil.fromJsonQuietly(content, typeReference);
        alerts = ExternalAlertIngressValidator.requireBatch(alerts);
        List<SingleAlert> singleAlerts = alerts.stream().map(this::convert).toList();
        for (SingleAlert singleAlert : singleAlerts) {
            alarmCommonReduce.reduceAndSendAlarm(workspaceId, singleAlert);
        }
    }

    @Override
    public String supportSource() {
        return "skywalking";
    }

    private SingleAlert convert(SkyWalkingExternAlert alert) {
        Long recoveryTime = alert.getRecoveryTime();
        long observedAt = recoveryTime == null ? Instant.now().toEpochMilli() : recoveryTime;
        return SingleAlert.builder()
                .content(alert.getAlarmMessage())
                .status(recoveryTime == null
                        ? CommonConstants.ALERT_STATUS_FIRING
                        : CommonConstants.ALERT_STATUS_RESOLVED)
                .activeAt(observedAt)
                .startAt(alert.getStartTime() != null ? alert.getStartTime() : observedAt)
                .endAt(recoveryTime)
                .labels(acquireAlertLabels(alert))
                .annotations(acquireAlertAnnotations(alert))
                .triggerTimes(1)
                .build();
    }

    private Map<String, String> acquireAlertLabels(SkyWalkingExternAlert externAlert){
        Map<String, String> labels = new HashMap<>(8);
        labels.put("__source__", "skywalking");
        putIfNotBlank(labels, "skywalking_uuid", externAlert.getUuid());
        putIfNotBlank(labels, "alertname", externAlert.getRuleName());
        putIfNotBlank(labels, "scope", externAlert.getScope());
        putIfNotBlank(labels, "entity_id", externAlert.getId0());
        putIfNotBlank(labels, "relation_destination_id", externAlert.getId1());
        List<SkyWalkingExternAlert.Tag> tags = externAlert.getTags();
        if (tags == null || tags.isEmpty()){
            return labels;
        }
        tags.forEach(tag -> putIfNotBlank(labels, tag.getKey(), tag.getValue()));
        return labels;
    }

    private void putIfNotBlank(Map<String, String> target, String key, String value) {
        if (StringUtils.isNotBlank(key) && StringUtils.isNotBlank(value)) {
            target.put(key, value);
        }
    }

    private Map<String, String> acquireAlertAnnotations(SkyWalkingExternAlert externAlert){
        Map<String, String> annotations = new HashMap<>(8);
        annotations.putIfAbsent("scope", externAlert.getScope());
        annotations.putIfAbsent("name", externAlert.getName());
        annotations.putIfAbsent("id0", externAlert.getId0());
        annotations.putIfAbsent("id1", externAlert.getId1());
        annotations.putIfAbsent("ruleName", externAlert.getRuleName());
        return annotations;
    }

}
