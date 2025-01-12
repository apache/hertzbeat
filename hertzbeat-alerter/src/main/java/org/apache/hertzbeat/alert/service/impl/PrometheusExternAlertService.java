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

import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dto.PrometheusExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
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
        
        PrometheusExternAlert alert = JsonUtil.fromJson(content, PrometheusExternAlert.class);
        if (alert == null) {
            log.warn("parse prometheus extern alert content failed! content: {}", content);
            return;
        }
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
        
        SingleAlert singleAlert = SingleAlert.builder()
                .content(description)
                .status(alert.getStatus())
                .activeAt(alert.getActiveAt())
                .startAt(alert.getStartsAt())
                .endAt(alert.getEndsAt())
                .labels(alert.getLabels())
                .annotations(alert.getAnnotations())
                .build();
        
        alarmCommonReduce.reduceAndSendAlarm(singleAlert);
    }

    @Override
    public String supportSource() {
        return "prometheus";
    }
}
