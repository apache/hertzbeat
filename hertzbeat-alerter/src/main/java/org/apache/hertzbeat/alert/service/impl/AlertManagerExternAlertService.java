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

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dto.AlertManagerExternAlert;
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
 * Alertmanager external alarm service impl
 */
@Slf4j
@Service
public class AlertManagerExternAlertService implements ExternAlertService {

    @Autowired
    private AlarmCommonReduce alarmCommonReduce;


    @Override
    public void addExternAlert(String content) {
        
        AlertManagerExternAlert alert = JsonUtil.fromJson(content, AlertManagerExternAlert.class);
        if (alert == null) {
            log.warn("parse alertmanager extern alert content failed! content: {}", content);
            return;
        }
        List<PrometheusExternAlert> alerts = alert.getAlerts();
        if (alerts == null || alerts.isEmpty()) {
            log.warn("receive alertmanager extern alert without alerts! content: {}", content);
            return;
        }
        for (PrometheusExternAlert prometheusAlert : alerts) {
            Map<String, String> annotations = prometheusAlert.getAnnotations();
            if (annotations == null) {
                annotations = new HashMap<>(8);
            }
            if (StringUtils.hasText(prometheusAlert.getGeneratorURL())) {
                annotations.put("generatorURL", prometheusAlert.getGeneratorURL());
            }
            String description = annotations.get("description");
            if (description == null) {
                description = annotations.get("summary");
            }
            if (description == null) {
                description = annotations.values().stream().findFirst().orElse("");
            }
            Map<String, String> labels = prometheusAlert.getLabels();
            if (labels == null) {
                labels = new HashMap<>(8);
            }
            labels.put("__source__", "alertmanager");
            String status = CommonConstants.ALERT_STATUS_FIRING;
            if (prometheusAlert.getEndsAt() != null && prometheusAlert.getEndsAt().isBefore(Instant.now())) {
                status = CommonConstants.ALERT_STATUS_RESOLVED;
            }
            SingleAlert singleAlert = SingleAlert.builder()
                    .content(description)
                    .status(status)
                    .activeAt(CommonConstants.ALERT_STATUS_FIRING.equals(status) ? Instant.now().toEpochMilli() : null)
                    .startAt(prometheusAlert.getStartsAt() != null ? prometheusAlert.getStartsAt().toEpochMilli() : Instant.now().toEpochMilli())
                    .endAt(CommonConstants.ALERT_STATUS_RESOLVED.equals(status) ? prometheusAlert.getEndsAt().toEpochMilli() : null)
                    .labels(labels)
                    .annotations(prometheusAlert.getAnnotations())
                    .triggerTimes(1)
                    .build();

            alarmCommonReduce.reduceAndSendAlarm(singleAlert);
        }
    }

    @Override
    public String supportSource() {
        return "alertmanager";
    }
}
