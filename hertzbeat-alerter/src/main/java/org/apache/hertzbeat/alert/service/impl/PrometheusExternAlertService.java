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

import com.fasterxml.jackson.core.type.TypeReference;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dto.PrometheusExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Prometheus external alarm service impl
 */
@Slf4j
@Service
public class PrometheusExternAlertService implements ExternAlertService {

    @Autowired
    private AlarmCommonReduce alarmCommonReduce;


    @Override
    public void addExternAlert(String content) {

        TypeReference<List<PrometheusExternAlert>> typeReference = new TypeReference<>() {};
        List<PrometheusExternAlert> alerts = JsonUtil.fromJson(content, typeReference);
        if (alerts == null || alerts.isEmpty()) {
            log.warn("parse prometheus extern alert content failed! content: {}", content);
            return;
        }
        for (PrometheusExternAlert alert : alerts) {
            Map<String, String> annotations = alert.getAnnotations();
            if (annotations == null) {
                annotations = new HashMap<>(8);
            }
            if (StringUtils.hasText(alert.getGeneratorURL())) {
                annotations.put("generatorURL", alert.getGeneratorURL());
            }
            String description = annotations.get("description");
            if (description == null) {
                description = annotations.get("summary");
            }
            if (description == null) {
                description = annotations.values().stream().findFirst().orElse("");
            }
            Map<String, String> labels = alert.getLabels();
            if (labels == null) {
                labels = new HashMap<>(8);
            }
            labels.put("__source__", "prometheus");
            String status = CommonConstants.ALERT_STATUS_FIRING;
            if (alert.getEndsAt() != null && alert.getEndsAt().isBefore(Instant.now())) {
                status = CommonConstants.ALERT_STATUS_RESOLVED;
            }
            SingleAlert singleAlert = SingleAlert.builder()
                    .content(description)
                    .status(status)
                    .activeAt(CommonConstants.ALERT_STATUS_FIRING.equals(status) ? Instant.now().toEpochMilli() : null)
                    .startAt(alert.getStartsAt() != null ? alert.getStartsAt().toEpochMilli() : Instant.now().toEpochMilli())
                    .endAt(CommonConstants.ALERT_STATUS_RESOLVED.equals(status) ? alert.getEndsAt().toEpochMilli() : null)
                    .labels(labels)
                    .annotations(alert.getAnnotations())
                    .triggerTimes(1)
                    .build();

            alarmCommonReduce.reduceAndSendAlarm(singleAlert);   
        }
    }

    @Override
    public String supportSource() {
        return "prometheus";
    }
}
