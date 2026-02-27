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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dto.UptimeKumaExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.Map;

/**
 * uptime-kuma external alarm service impl
 */
@Slf4j
@Service
public class UptimeKumaExternAlertServiceImpl implements ExternAlertService {

    @Autowired
    private AlarmCommonReduce alarmCommonReduce;

    @Override
    public void addExternAlert(String content) {
        UptimeKumaExternAlert alert = JsonUtil.fromJson(content, UptimeKumaExternAlert.class);
        if (alert == null) {
            log.warn("parse extern alert content failed! content: {}", content);
            return;
        }
        SingleAlert singleAlert = new UptimeKumaAlertConverter().convert(alert);
        alarmCommonReduce.reduceAndSendAlarm(singleAlert);
    }

    /**
     * Converter: UptimeKuma alert to SingleAlert
     */
    public static class UptimeKumaAlertConverter {

        /**
         * Convert UptimeKuma alert to SingleAlert
         */
        public SingleAlert convert(UptimeKumaExternAlert alert) {
            // build basic info
            SingleAlert.SingleAlertBuilder builder = SingleAlert.builder()
                    .status(convertStatus(alert.getHeartbeat().getStatus()))
                    .startAt(parseTime(alert.getHeartbeat().getTime()))
                    .activeAt(parseTime(alert.getHeartbeat().getTime()))
                    .triggerTimes(1);

            // build labels
            Map<String, String> labels = new HashMap<>();
            labels.put("__source__", "uptime_kuma");
            labels.put("monitor_id", String.valueOf(alert.getMonitor().getId()));
            labels.put("monitor_name", alert.getMonitor().getName());

            // build annotations
            Map<String, String> annotations = new HashMap<>();
            annotations.put("description", alert.getMonitor().getDescription());
            annotations.put("message", alert.getHeartbeat().getMsg());
            annotations.put("important", String.valueOf(alert.getHeartbeat().isImportant()));

            return builder
                    .labels(labels)
                    .annotations(annotations)
                    .content(buildContent(alert))
                    .build();
        }

        private String buildContent(UptimeKumaExternAlert alert) {
            return String.format("Monitor [%s] %s: %s",
                    alert.getMonitor().getName(),
                    alert.getMonitor().getDescription(),
                    alert.getHeartbeat().getMsg());
        }

        private String convertStatus(int status) {
            // uptime kuma status: 1-up, 0-down, 2-pending
            return status == 1 ? CommonConstants.ALERT_STATUS_RESOLVED : CommonConstants.ALERT_STATUS_FIRING;
        }

        private Long parseTime(String timeStr) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                return sdf.parse(timeStr).getTime();
            } catch (ParseException e) {
                log.error("Failed to parse time: {}", timeStr);
                throw new IllegalArgumentException("Failed to parse time: " + timeStr, e);
            }
        }
    }

    @Override
    public String supportSource() {
        return "uptime-kuma";
    }
}
