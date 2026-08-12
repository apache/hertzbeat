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
import java.time.format.DateTimeParseException;
import java.util.Collection;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dto.AlibabaCloudCmsExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Service;

/**
 * Alibaba Cloud Monitor 2.0 external alert service.
 */
@Slf4j
@Service
public class AlibabaCloudCmsExternAlertService implements ExternAlertService {

    private static final String SOURCE = "alibabacloud-cms";

    private final AlarmCommonReduce alarmCommonReduce;

    public AlibabaCloudCmsExternAlertService(AlarmCommonReduce alarmCommonReduce) {
        this.alarmCommonReduce = alarmCommonReduce;
    }

    @Override
    public void addExternAlert(String content) {
        AlibabaCloudCmsExternAlert externAlert = JsonUtil.fromJson(content, AlibabaCloudCmsExternAlert.class);
        if (externAlert == null || StringUtils.isBlank(externAlert.getStatus())) {
            log.warn("Failed to parse Alibaba Cloud Monitor external alert content: {}", content);
            return;
        }
        alarmCommonReduce.reduceAndSendAlarm(convert(externAlert));
    }

    @Override
    public String supportSource() {
        return SOURCE;
    }

    private SingleAlert convert(AlibabaCloudCmsExternAlert externAlert) {
        boolean resolved = isResolved(externAlert);
        long eventTime = getEventTime(externAlert);
        return SingleAlert.builder()
                .content(getAlertContent(externAlert))
                .status(resolved ? CommonConstants.ALERT_STATUS_RESOLVED : CommonConstants.ALERT_STATUS_FIRING)
                .startAt(eventTime)
                .activeAt(resolved ? null : eventTime)
                .endAt(resolved ? eventTime : null)
                .labels(buildLabels(externAlert))
                .annotations(buildAnnotations(externAlert))
                .triggerTimes(1)
                .build();
    }

    private boolean isResolved(AlibabaCloudCmsExternAlert externAlert) {
        return "RESOLVED".equalsIgnoreCase(externAlert.getStatus())
                || "RECOVERED".equalsIgnoreCase(externAlert.getStatus())
                || "NORMAL_RESOLVE".equalsIgnoreCase(externAlert.getSubtype());
    }

    private long getEventTime(AlibabaCloudCmsExternAlert externAlert) {
        if (externAlert.getTimestamp() != null && externAlert.getTimestamp() > 0) {
            return externAlert.getTimestamp();
        }
        if (StringUtils.isNotBlank(externAlert.getTime())) {
            try {
                return Instant.parse(externAlert.getTime()).toEpochMilli();
            } catch (DateTimeParseException e) {
                log.warn("Failed to parse Alibaba Cloud Monitor event time: {}", externAlert.getTime());
            }
        }
        return Instant.now().toEpochMilli();
    }

    private Map<String, String> buildLabels(AlibabaCloudCmsExternAlert externAlert) {
        Map<String, String> labels = new HashMap<>(16);
        putValues(labels, externAlert.getLabels());
        AlibabaCloudCmsExternAlert.Resource resource = externAlert.getResource();
        if (resource != null) {
            putValues(labels, resource.getTags());
            AlibabaCloudCmsExternAlert.Entity entity = resource.getEntity();
            if (entity != null) {
                putIfNotBlank(labels, "resourceDomain", entity.getDomain());
                putIfNotBlank(labels, "resourceType", entity.getEntityType());
                putIfNotBlank(labels, "resourceId", entity.getEntityId());
            }
        }
        labels.put("__source__", SOURCE);
        putIfNotBlank(labels, CommonConstants.LABEL_ALERT_NAME, externAlert.getSubject());
        putIfNotBlank(labels, CommonConstants.LABEL_ALERT_SEVERITY, convertSeverity(externAlert.getSeverity()));
        putIfNotBlank(labels, "ruleId", externAlert.getRuleId());
        putIfNotBlank(labels, "workspace", externAlert.getWorkspace());
        putIfNotBlank(labels, "alertEntityId", externAlert.getAlertEntityId());
        putIfNotBlank(labels, "userId", externAlert.getUserId());
        return labels;
    }

    private Map<String, String> buildAnnotations(AlibabaCloudCmsExternAlert externAlert) {
        Map<String, String> annotations = new HashMap<>(16);
        putValues(annotations, externAlert.getAnnotations());
        AlibabaCloudCmsExternAlert.Resource resource = externAlert.getResource();
        if (resource != null && resource.getEntity() != null) {
            putValues(annotations, resource.getEntity().getProp());
        }
        putValues(annotations, externAlert.getAlertEntityFields());
        AlibabaCloudCmsExternAlert.AlertData data = externAlert.getData();
        if (data != null) {
            putValue(annotations, "value", data.getValue());
            putValue(annotations, "threshold", data.getThreshold());
            putIfNotBlank(annotations, "comparisonOperator", data.getComparisonOperator());
        }
        putIfNotBlank(annotations, "alertMessage", externAlert.getAlertMessage());
        putIfNotBlank(annotations, "traceId", externAlert.getTraceId());
        putIfNotBlank(annotations, "ruleUrl", externAlert.getRuleUrl());
        putIfNotBlank(annotations, "entityUrl", externAlert.getEntityUrl());
        putIfNotBlank(annotations, "alertRuleUrl", externAlert.getAlertRuleUrl());
        putIfNotBlank(annotations, "alertHistoryUrl", externAlert.getAlertHistoryUrl());
        return annotations;
    }

    private String getAlertContent(AlibabaCloudCmsExternAlert externAlert) {
        if (StringUtils.isNotBlank(externAlert.getAlertMessage())) {
            return externAlert.getAlertMessage();
        }
        if (StringUtils.isNotBlank(externAlert.getSubject())) {
            return externAlert.getSubject();
        }
        return "Alibaba Cloud Monitor alert";
    }

    private String convertSeverity(String severity) {
        if (StringUtils.isBlank(severity)) {
            return null;
        }
        return switch (severity.toUpperCase(Locale.ROOT)) {
            case "EMERGENCY" -> CommonConstants.ALERT_SEVERITY_EMERGENCY;
            case "CRITICAL" -> CommonConstants.ALERT_SEVERITY_CRITICAL;
            case "WARN", "WARNING" -> CommonConstants.ALERT_SEVERITY_WARNING;
            case "INFO", "INFORMATIONAL" -> CommonConstants.ALERT_SEVERITY_INFO;
            default -> severity.toLowerCase(Locale.ROOT);
        };
    }

    private void putValues(Map<String, String> target, Map<String, Object> values) {
        if (values == null || values.isEmpty()) {
            return;
        }
        values.forEach((key, value) -> putValue(target, key, value));
    }

    private void putValue(Map<String, String> target, String key, Object value) {
        if (StringUtils.isBlank(key) || value == null) {
            return;
        }
        String stringValue;
        if (value instanceof Map<?, ?> || value instanceof Collection<?>) {
            stringValue = JsonUtil.toJson(value);
        } else {
            stringValue = String.valueOf(value);
        }
        putIfNotBlank(target, key, stringValue);
    }

    private void putIfNotBlank(Map<String, String> target, String key, String value) {
        if (StringUtils.isNotBlank(value)) {
            target.put(key, value);
        }
    }
}
