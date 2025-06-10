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

import io.netty.util.Constant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.ArrayList;
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
        for (SingleAlert singleAlert : new VolcEngineAlertConverter().convert(report)) {
            alarmCommonReduce.reduceAndSendAlarm(singleAlert);
        }
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
        public List<SingleAlert> convert(VolcEngineExternAlert alert) {
            String status = convertStatus(alert);
            String level = convertLevel(alert);
            if (Objects.equals(alert.getType(), VolcEngineExternAlert.ALERT_TYPE_METRIC)) {
                return convertMetricAlert(alert, status, level, alert.getResources());
            }
            if (Objects.equals(alert.getType(), VolcEngineExternAlert.ALERT_TYPE_EVENT)) {
                //
                return null;
            }
            if (Objects.equals(alert.getType(), VolcEngineExternAlert.ALERT_TYPE_METRICS_NODATA)) {
                return convertMetricAlert(alert, status, level, alert.getNoDataResources());
            }
            if (Objects.equals(alert.getType(), VolcEngineExternAlert.ALERT_TYPE_NO_DATA_RECOVERED)) {
                return convertMetricAlert(alert, status, level, alert.getNoDataRecoveredResources());
            }
            if (Objects.equals(alert.getType(), VolcEngineExternAlert.ALERT_TYPE_METRIC_RECOVERED)) {
                return convertMetricAlert(alert, status, level, alert.getRecoveredResources());
            }
            return List.of();
        }

        private String convertLevel(VolcEngineExternAlert volcEngineExternAlert) {
            return switch (volcEngineExternAlert.getLevel()) {
                case "critical" -> CommonConstants.ALERT_SEVERITY_CRITICAL;
                case "warning" -> CommonConstants.ALERT_SEVERITY_WARNING;
                default -> CommonConstants.ALERT_SEVERITY_INFO;
            };
        }

        private List<SingleAlert> convertMetricAlert(VolcEngineExternAlert alert, String status, String severity,
                                                     List<? extends VolcEngineExternAlert.Resource> resources) {
            List<SingleAlert> result = new ArrayList<>();
            for (VolcEngineExternAlert.Resource resource : resources) {
                SingleAlert.SingleAlertBuilder builder = SingleAlert.builder()
                        .status(status)
                        .startAt(resource.getFirstAlertTime() * 1000)
                        .endAt(resource.getLastAlertTime() * 1000)
                        .labels(buildLabels(alert, resource, severity))
                        .activeAt(convertHappenAt(alert.getHappenedAt()))
                        .content(resource.getName() + alert.getRuleCondition())
                        .annotations(buildAnnotations(resource));
                result.add(builder.build());
            }
            return result;
        }


        private Long convertHappenAt(String happenAt) {
            String cleanedStr = happenAt.replace("UTC", "").replace("(", "").replace(")", "");
            DateTimeFormatter altFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ssXXX");
            OffsetDateTime odt = OffsetDateTime.parse(cleanedStr, altFormatter);
            return odt.toEpochSecond() * 1000;
        }

        private Map<String, String> buildLabels(VolcEngineExternAlert alert, VolcEngineExternAlert.Resource resource, String severity) {
            Map<String, String> labels = new HashMap<>();
            labels.put("severity", severity);
            labels.put("__source__", "volcengine");
            labels.put("alert_type", alert.getType());
            labels.put("resource_name", resource.getName());
            labels.put("resource_id", resource.getId());
            labels.put("rule_name", alert.getRuleName());
            labels.put("rule_id", alert.getRuleId());
            labels.put("account_id", alert.getAccountId());
            labels.put("region", resource.getRegion());
            return labels;
        }

        private Map<String, String> buildAnnotations(VolcEngineExternAlert.Resource resource) {
            Map<String, String> annotations = new HashMap<>();
            if (resource instanceof VolcEngineExternAlert.NoDataResource noDataResource) {
                for (VolcEngineExternAlert.Metric noDataMetric : noDataResource.getNoDataMetrics()) {
                    annotations.put(noDataMetric.getName(), "N/A");
                }
            }
            for (VolcEngineExternAlert.Metric metric : resource.getMetrics()) {
                annotations.put(metric.getName(), metric.getCurrentValue() + metric.getUnit());
            }
            return annotations;
        }

        /**
         * convert volcengine alert status to heartbeat alert status
         *
         * @param alert volcengine alert
         * @return status
         */
        private String convertStatus(VolcEngineExternAlert alert) {
            String type = alert.getType();
            if (Objects.equals(type, VolcEngineExternAlert.ALERT_TYPE_METRIC)
                    || Objects.equals(type, VolcEngineExternAlert.ALERT_TYPE_EVENT)
                    || Objects.equals(type, VolcEngineExternAlert.ALERT_TYPE_METRICS_NODATA)) {
                return CommonConstants.ALERT_STATUS_FIRING;
            }
            return CommonConstants.ALERT_STATUS_RESOLVED;
        }
    }
}
