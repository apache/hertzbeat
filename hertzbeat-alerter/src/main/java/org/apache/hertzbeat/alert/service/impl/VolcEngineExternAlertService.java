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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.hertzbeat.alert.dto.VolcEngineExternEventAlert;
import org.apache.hertzbeat.alert.dto.VolcEngineExternMetricAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Service;

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
    private static final Map<String, Integer> severityOrder = Map.of(
            CommonConstants.ALERT_SEVERITY_CRITICAL, 1,
            CommonConstants.ALERT_SEVERITY_WARNING, 2,
            CommonConstants.ALERT_SEVERITY_INFO, 3
    );

    @Override
    @SneakyThrows
    public void addExternAlert(String content) {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(content);
        String type = root.get("Type").asText();
        if (VolcEngineExternMetricAlert.ALERT_TYPE_EVENT.equals(type)) {
            VolcEngineExternEventAlert eventAlert = JsonUtil.fromJson(content, VolcEngineExternEventAlert.class);
            if (eventAlert == null) {
                log.warn("parse extern event alert content failed! content: {}", content);
                return;
            }
            SingleAlert singleAlert = new VolcEngineAlertConverter().convertEventToSingleAlert(eventAlert);
            alarmCommonReduce.reduceAndSendAlarm(singleAlert);

        } else {
            // deal with metric alert
            VolcEngineExternMetricAlert report = JsonUtil.fromJson(content, VolcEngineExternMetricAlert.class);
            if (report == null) {
                log.warn("parse extern metrics alert content failed! content: {}", content);
                return;
            }
            for (SingleAlert singleAlert : new VolcEngineAlertConverter().convertMetricAlertToSingeAlert(report)) {
                alarmCommonReduce.reduceAndSendAlarm(singleAlert);
            }
        }
    }

    @Override
    public String supportSource() {
        return "volcengine";
    }

    /**
     * Converter: VolcEngine alert to SingleAlert
     */
    public static class VolcEngineAlertConverter {

        /**
         * Convert VolcEngine metric alert to SingleAlert List
         */
        public List<SingleAlert> convertMetricAlertToSingeAlert(VolcEngineExternMetricAlert alert) {
            String status = convertStatus(alert);
            if (Objects.equals(alert.getType(), VolcEngineExternMetricAlert.ALERT_TYPE_METRIC)) {
                return convertMetricAlert(alert, status, alert.getResources());
            }
            if (Objects.equals(alert.getType(), VolcEngineExternMetricAlert.ALERT_TYPE_METRICS_NODATA)) {
                return convertMetricAlert(alert, status, alert.getNoDataResources());
            }
            if (Objects.equals(alert.getType(), VolcEngineExternMetricAlert.ALERT_TYPE_NO_DATA_RECOVERED)) {
                return convertMetricAlert(alert, status, alert.getNoDataRecoveredResources());
            }
            if (Objects.equals(alert.getType(), VolcEngineExternMetricAlert.ALERT_TYPE_METRIC_RECOVERED)) {
                return convertMetricAlert(alert, status, alert.getRecoveredResources());
            }
            return List.of();
        }

        public SingleAlert convertEventToSingleAlert(VolcEngineExternEventAlert alert) {
            SingleAlert.SingleAlertBuilder builder = SingleAlert.builder()
                    .status(CommonConstants.ALERT_STATUS_FIRING)
                    .startAt(alert.getHappenedAt() * 1000)
                    .activeAt(alert.getHappenedAt() * 1000)
                    .labels(buildEventLabels(alert))
                    .content(alert.getDescriptionCn())
                    .annotations(new HashMap<>());
            return builder.build();
        }

        /**
         * build labels for volcengine event alert
         */
        private Map<String, String> buildEventLabels(VolcEngineExternEventAlert event) {
            Map<String, String> labels = new HashMap<>();
            labels.put("severity", convertEventSeverity(event));
            labels.put("__source__", "volcengine");
            labels.put("resource_name", event.getDetails().getVolcResourceName());
            labels.put("account_id", event.getAccountId());
            labels.put("region", event.getRegion());
            labels.put("event_type", event.getEventType());
            labels.put("source", event.getSource());
            return labels;

        }

        /**
         * convert volcengine event alert status to heartbeat alert status
         * use the most severe level in the rules
         *
         * @param alert volcengine event alert
         * @return status
         */
        private String convertEventSeverity(VolcEngineExternEventAlert alert) {
            return alert.getRules().stream().map(VolcEngineExternEventAlert.EventRule::getLevel)
                    .min((o1, o2) -> severityOrder.get(convertCommonSeverity(o1)).compareTo(severityOrder.get(convertCommonSeverity(o2))))
                    .orElse(CommonConstants.ALERT_SEVERITY_INFO);
        }

        private String convertCommonSeverity(String level) {
            return switch (level) {
                case "critical" -> CommonConstants.ALERT_SEVERITY_CRITICAL;
                case "warning" -> CommonConstants.ALERT_SEVERITY_WARNING;
                default -> CommonConstants.ALERT_SEVERITY_INFO;
            };
        }

        /**
         * create SingleAlert for each resources in volcengine alert
         *
         * @param alert     volcengine alert
         * @param status    status
         * @param resources resources
         * @return List of SingleAlert
         */
        private List<SingleAlert> convertMetricAlert(VolcEngineExternMetricAlert alert, String status,
                                                     List<? extends VolcEngineExternMetricAlert.Resource> resources) {
            if (CollectionUtils.isEmpty(resources)) {
                return List.of();
            }
            List<SingleAlert> result = new ArrayList<>();
            for (VolcEngineExternMetricAlert.Resource resource : resources) {
                SingleAlert.SingleAlertBuilder builder = SingleAlert.builder()
                        .status(status)
                        .startAt(resource.getFirstAlertTime() * 1000)
                        .endAt(resource.getLastAlertTime() * 1000)
                        .labels(buildLabels(alert, resource))
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

        private Map<String, String> buildLabels(VolcEngineExternMetricAlert alert, VolcEngineExternMetricAlert.Resource resource) {
            Map<String, String> labels = new HashMap<>();
            labels.put("__source__", "volcengine");
            labels.put("resource_name", resource.getName());
            labels.put("resource_id", resource.getId());
            labels.put("rule_id", alert.getRuleId());
            return labels;
        }

        private Map<String, String> buildAnnotations(VolcEngineExternMetricAlert.Resource resource) {
            Map<String, String> annotations = new HashMap<>();
            if (resource instanceof VolcEngineExternMetricAlert.NoDataResource noDataResource) {
                for (VolcEngineExternMetricAlert.Metric noDataMetric : noDataResource.getNoDataMetrics()) {
                    annotations.put(noDataMetric.getName(), "N/A");
                }
            }
            for (VolcEngineExternMetricAlert.Metric metric : resource.getMetrics()) {
                annotations.put(metric.getName(), metric.getCurrentValue() + metric.getUnit());
            }
            annotations.put("region", resource.getRegion());
            List<VolcEngineExternMetricAlert.Dimension> dimensions = resource.getDimensions();
            if (CollectionUtils.isNotEmpty(dimensions)) {
                for (VolcEngineExternMetricAlert.Dimension dimension : dimensions) {
                    annotations.put(dimension.getNameCn(), dimension.getValue());
                }
            }
            return annotations;
        }

        /**
         * convert volcengine alert status to heartbeat alert status
         *
         * @param alert volcengine alert
         * @return status
         */
        private String convertStatus(VolcEngineExternMetricAlert alert) {
            String type = alert.getType();
            if (Objects.equals(type, VolcEngineExternMetricAlert.ALERT_TYPE_METRIC)
                    || Objects.equals(type, VolcEngineExternMetricAlert.ALERT_TYPE_EVENT)
                    || Objects.equals(type, VolcEngineExternMetricAlert.ALERT_TYPE_METRICS_NODATA)) {
                return CommonConstants.ALERT_STATUS_FIRING;
            }
            return CommonConstants.ALERT_STATUS_RESOLVED;
        }
    }
}
