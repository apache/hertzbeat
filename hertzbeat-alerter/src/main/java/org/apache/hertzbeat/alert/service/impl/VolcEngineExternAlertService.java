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

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dto.TencentCloudExternAlert;
import org.apache.hertzbeat.alert.dto.VolcEngineExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Volcengine alarm entity class
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VolcEngineExternAlertService implements ExternAlertService {

    private final AlarmCommonReduce alarmCommonReduce;

    @Override
    public void addExternAlert(String content) {
        VolcEngineExternAlert report = JsonUtil.fromJson(content, VolcEngineExternAlert.class);
        if (report == null) {
            log.warn("parse extern alert content failed! content: {}", content);
            return;
        }
        SingleAlert alert = new VolcEngineAlertConverter().convert(report);
        alarmCommonReduce.reduceAndSendAlarm(alert);
    }

    @Override
    public String supportSource() {
        return "volcengine";
    }

    /**
     * Converter: TencentCloud alert to SingleAlert
     */
    public static class VolcEngineAlertConverter {

        /**
         * Metric alert content template
         */
        private final String metricTemplate = "Tencent Cloud Metric Alert: {metricShowName} {calcType} {calcValue}{calcUnit}, Current: {currentValue}{unit}";

        /**
         * Event alert content template
         */
        private final String eventTemplate = "Tencent Cloud Event Alert: {productShowName} - {eventShowName}";


        /**
         * Convert TencentCloud alert to SingleAlert
         */
        public SingleAlert convert(VolcEngineExternAlert volcEngineExternAlert) {
            // Building basic information
//            SingleAlert.SingleAlertBuilder builder = SingleAlert.builder()
//                    .status(convertStatus(volcEngineExternAlert))
//                    .startAt(parseTime(volcEngineExternAlert.get)
//                            .activeAt(parseTime(tencentAlert.getFirstOccurTime()))
//                            .triggerTimes(1);
//            // If it is a recovery state, set the end time.
//            if ("0".equals(tencentAlert.getAlarmStatus())) {
//                builder.endAt(parseTime(tencentAlert.getRecoverTime()));
//            }
//
//            // Build labels
//            Map<String, String> labels = new HashMap<>();
//            buildLabels(labels, tencentAlert);
//
//            // Build annotations
//            Map<String, String> annotations = new HashMap<>();
//            buildAnnotations(annotations, tencentAlert);
//
//            // Build content
//            String content = generateContent(tencentAlert);
//
//            return builder
//                    .labels(labels)
//                    .annotations(annotations)
//                    .content(content)
//                    .build();
            return null;
        }

        public List<SingleAlert> convertResourcesToAlert(VolcEngineExternAlert volcEngineExternAlert) {
            String status = convertStatus(volcEngineExternAlert);
            for (VolcEngineExternAlert.Resource resource : volcEngineExternAlert.getResources()) {
                SingleAlert.SingleAlertBuilder builder = SingleAlert.builder()
                        .status(status)
                        .startAt(resource.getFirstAlertTime() * 1000)
                        .endAt(resource.getLastAlertTime() * 1000)
                        .labels(buildLabels(volcEngineExternAlert, resource))
                        .activeAt(convertHappenAt(volcEngineExternAlert.getHappenedAt()))
                        .annotations(buildAnnotations(volcEngineExternAlert, resource));
            }

            return null;
        }

        private Long convertHappenAt(String happenAt) {
            String cleanedStr = happenAt.replace("UTC", "").replace("(", "").replace(")", "");
            DateTimeFormatter altFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ssXXX");
            OffsetDateTime odt = OffsetDateTime.parse(cleanedStr, altFormatter);
            return odt.toEpochSecond() * 1000;
        }


        private Map<String, String> buildLabels(VolcEngineExternAlert alert, VolcEngineExternAlert.Resource resource) {
            Map<String, String> labels = new HashMap<>();
            labels.put("__source__", "volcengine");
            labels.put("alert_type", alert.getType());
            labels.put("resource_name", resource.getName());
            labels.put("resource_id", resource.getId());
            labels.put("rule_name", alert.getRuleName());
            labels.put("rule_id", alert.getRuleId());
            labels.put("region", resource.getRegion());
            return labels;
        }

        private Map<String, String> buildAnnotations(VolcEngineExternAlert alert, VolcEngineExternAlert.Resource resource) {
            Map<String, String> annotations = new HashMap<>();
            for (VolcEngineExternAlert.Metric metric : resource.getMetrics()) {
                annotations.put(metric.getName(), metric.getCurrentValue() + metric.getUnit());
            }
            return annotations;
        }

        /**
         * Generate event alert content
         */
        private String generateEventContent(TencentCloudExternAlert alert) {
            TencentCloudExternAlert.Conditions conditions = alert.getAlarmPolicyInfo().getConditions();
            Map<String, String> params = new HashMap<>();
            params.put("productShowName", conditions.getProductShowName());
            params.put("eventShowName", conditions.getEventShowName());
            return replacePlaceholders(eventTemplate, params);
        }

        /**
         * Replace placeholders in template with actual values
         */
        private String replacePlaceholders(String template, Map<String, String> params) {
            String result = template;
            for (Map.Entry<String, String> entry : params.entrySet()) {
                result = result.replace("{" + entry.getKey() + "}", Objects.toString(entry.getValue(), "NULL"));
            }
            return result;
        }

        private String convertStatus(VolcEngineExternAlert alert) {
            String type = alert.getType();
            if (Objects.equals(type, VolcEngineExternAlert.ALERT_TYPE_METRIC)
                    || Objects.equals(type, VolcEngineExternAlert.ALERT_TYPE_EVENT)
                    || Objects.equals(type, VolcEngineExternAlert.ALERT_TYPE_METRICS_NODATA)) {
                return CommonConstants.ALERT_STATUS_FIRING;
            } else if (Objects.equals(type, VolcEngineExternAlert.ALERT_TYPE_METRIC_RECOVERED)
                    || Objects.equals(type, VolcEngineExternAlert.ALERT_TYPE_NO_DATA_RECOVERED)) {
                return CommonConstants.ALERT_STATUS_RESOLVED;
            }
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

        private void putIfNotNull(Map<String, String> map, String key, String value) {
            if (StringUtils.isNotEmpty(value)) {
                map.put(key, value);
            }
        }
    }
}
