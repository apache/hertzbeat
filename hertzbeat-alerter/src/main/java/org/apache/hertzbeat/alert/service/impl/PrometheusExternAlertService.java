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

import tools.jackson.core.type.TypeReference;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
@Service
public class PrometheusExternAlertService implements ExternAlertService {

    @Autowired
    private AlarmCommonReduce alarmCommonReduce;


    @Override
    public void addExternAlert(String content) {

        TypeReference<List<PrometheusExternAlert>> typeReference = new TypeReference<>() {};
        List<PrometheusExternAlert> alerts = ExternalAlertIngressValidator.requireBatch(
                JsonUtil.fromJsonQuietly(content, typeReference));
        List<SingleAlert> singleAlerts = alerts.stream()
                .map(this::toSingleAlert)
                .toList();
        singleAlerts.forEach(alarmCommonReduce::reduceAndSendAlarm);
    }

    private SingleAlert toSingleAlert(PrometheusExternAlert alert) {
        Map<String, String> annotations =
                ExternalAlertIngressValidator.normalizeAnnotations(alert.getAnnotations());
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
        Map<String, String> labels =
                ExternalAlertIngressValidator.requireBusinessLabels(alert.getLabels());
        labels.put("__source__", "prometheus");
        String status = CommonConstants.ALERT_STATUS_FIRING;
        Instant endsAt = alert.getEndsAt();
        // Prometheus uses its zero time (year 1) when an active alert has no end.
        if (endsAt != null && endsAt.getEpochSecond() > 0 && endsAt.isBefore(Instant.now())) {
            status = CommonConstants.ALERT_STATUS_RESOLVED;
        }
        return ExternalAlertIngressValidator.normalize(SingleAlert.builder()
                .content(description)
                .status(status)
                .activeAt(CommonConstants.ALERT_STATUS_FIRING.equals(status) ? Instant.now().toEpochMilli() : null)
                .startAt(alert.getStartsAt() != null ? alert.getStartsAt().toEpochMilli() : Instant.now().toEpochMilli())
                .endAt(CommonConstants.ALERT_STATUS_RESOLVED.equals(status) ? endsAt.toEpochMilli() : null)
                .labels(labels)
                .annotations(annotations)
                .triggerTimes(1)
                .build());
    }

    @Override
    public String supportSource() {
        return "prometheus";
    }
}
