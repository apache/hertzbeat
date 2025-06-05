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
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dto.AlibabaCloudSlsExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Service;

import java.text.MessageFormat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Alibaba Cloud 'Simple Log Service(SLS)'  external alarm service impl
 */
@Slf4j
@Service
public class AlibabaCloudSlsExternAlertService implements ExternAlertService {

    private final AlarmCommonReduce alarmCommonReduce;

    public AlibabaCloudSlsExternAlertService(AlarmCommonReduce alarmCommonReduce) {
        this.alarmCommonReduce = alarmCommonReduce;
    }

    @Override
    public void addExternAlert(String content) {
        AlibabaCloudSlsExternAlert externAlert = JsonUtil.fromJson(content, AlibabaCloudSlsExternAlert.class);
        if (externAlert == null) {
            log.warn("Failure to parse external alert content. content: {}", content);
            return;
        }
        SingleAlert singleAlert = new AlibabaCloudSlsConverter().convert(externAlert);
        alarmCommonReduce.reduceAndSendAlarm(singleAlert);
    }

    @Override
    public String supportSource() {
        return "alibabacloud-sls";
    }

    /**
     *
     */
    public static class AlibabaCloudSlsConverter {

        /**
         * convert
         *
         * @param externAlert alert content entity
         * @return Single alert
         */
        public SingleAlert convert(AlibabaCloudSlsExternAlert externAlert) {
            return SingleAlert.builder()
                    .triggerTimes(1)
                    .status(externAlert.getStatus())
                    .startAt(Instant.ofEpochSecond(externAlert.getFireTime()).toEpochMilli())
                    .activeAt(Instant.ofEpochSecond(externAlert.getAlertTime()).toEpochMilli())
                    .endAt(convertResolveTime(externAlert.getStatus(), externAlert.getResolveTime()))
                    .labels(buildLabels(externAlert))
                    .annotations(buildAnnotations(externAlert))
                    .content(formatContent(externAlert))
                    .build();
        }

        /**
         * todo i18n
         *
         * @param externAlert alert content entity
         * @return content
         */
        private String formatContent(AlibabaCloudSlsExternAlert externAlert) {
            // convet severity
            Optional<AlibabaCloudSlsExternAlert.Severity> severity = AlibabaCloudSlsExternAlert.Severity.convert(externAlert.getSeverity());
            // If the alarm state is resolved, the value is the specific recovery time.
            Long resolveTimeMilli = convertResolveTime(externAlert.getStatus(), externAlert.getResolveTime());

            return MessageFormat.format(
            "AlibabaCloud-sls alert , {0} - [{1}], level: [{2}], desc: {3}, fire_time:{4}, resolve_time:{5}",
                    externAlert.getAnnotation("title"),
                    externAlert.getStatus(),
                    severity.isPresent() ? severity.get().getAlias() : "N/A",
                    externAlert.getAnnotation("desc"),
                    timeSecondToDate(Instant.ofEpochSecond(externAlert.getFireTime()).toEpochMilli()),
                    null != resolveTimeMilli ? timeSecondToDate(resolveTimeMilli) : "N/A"
            );
        }

        /**
         * Converts a timestamp (milliseconds) to a formatted date-time string.
         *
         * @param timestampMillis timestamp in milliseconds
         * @return formatted date-time string in the pattern: yyyy-MM-dd HH:mm:ss
         */
        private String timeSecondToDate(long timestampMillis) {
            LocalDateTime dateTime = LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(timestampMillis),
                    ZoneId.systemDefault()
            );
            return dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }

        /**
         * Build basic annotations and fill annotations for alibaba cloud sls.
         *
         * @param externAlert alert content entity
         * @return annotations
         */
        private Map<String, String> buildAnnotations(AlibabaCloudSlsExternAlert externAlert) {
            Map<String, String> annotations = new HashMap<>(8);
            Optional<AlibabaCloudSlsExternAlert.Severity> severity = AlibabaCloudSlsExternAlert.Severity.convert(externAlert.getSeverity());
            severity.ifPresent(value -> annotations.put("severity", value.getAlias()));
            // Notification templates for sls need to be configured.
            if (StringUtils.isNotBlank(externAlert.getSigninUrl()) && IpDomainUtil.isHasSchema(externAlert.getSigninUrl())) {
                annotations.put("signinUrl", "<a target=\"_blank\" href=\"" + externAlert.getSigninUrl() + "\">View Details</a>");
            }
            // Filling the annotations with the alibaba cloud sls.
            if (null != externAlert.getAnnotations() && !externAlert.getAnnotations().isEmpty()) {
                annotations.putAll(externAlert.getAnnotations());
            }

            return annotations;
        }

        /**
         * Build basic labels and fill labels for alibaba cloud sls.
         *
         * @param externAlert alert content entity
         * @return labels
         */
        private Map<String, String> buildLabels(AlibabaCloudSlsExternAlert externAlert) {
            Map<String, String> labels = new HashMap<>(8);
            labels.put("__source__", "alibabacloud-sls");
            labels.put("alertname", externAlert.getAlertName());
            labels.put("region", externAlert.getRegion());
            // The project name is globally unique.
            labels.put("project", externAlert.getProject());
            // Filling the labels with the alibaba cloud sls.
            if (null != externAlert.getLabels() && !externAlert.getLabels().isEmpty()){
                labels.putAll(externAlert.getLabels());
            }
            return labels;
        }

        /**
         * If the alarm status is firing, the value is 0.
         * If the alarm state is resolved, the value is the specific recovery time.
         *
         * @param status alert status
         * @param resolveTimeSecond recovery time
         * @return milliseconds
         */
        private Long convertResolveTime(String status, int resolveTimeSecond) {
            return CommonConstants.ALERT_STATUS_RESOLVED.equals(status) ? Instant.ofEpochSecond(resolveTimeSecond).toEpochMilli() : null;
        }
    }

}