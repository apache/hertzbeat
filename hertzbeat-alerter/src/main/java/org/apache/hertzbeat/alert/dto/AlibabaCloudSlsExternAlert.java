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

package org.apache.hertzbeat.alert.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;


/**
 * Alibaba Cloud 'Simple Log Service(SLS)' alert content entity.
 *
 * @see <a href="https://help.aliyun.com/zh/sls/user-guide/variables-in-new-alert-templates"/>
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AlibabaCloudSlsExternAlert {

    /**
     * The id of the instance on which the alarm was triggered
     */
    @JsonProperty("alert_instance_id")
    private String alertInstanceId;

    /**
     * Alarm rule id, unique within project
     */
    @JsonProperty("alert_id")
    private String alertId;

    /**
     * Alarm rule name
     */
    @JsonProperty("alert_name")
    private String alertName;

    /**
     * Region
     */
    private String region;

    /**
     * Alarm rule belongs to Project
     */
    private String project;

    /**
     * Time of this evaluation
     */
    @JsonProperty("alert_time")
    private int alertTime;

    /**
     * First trigger time
     */
    @JsonProperty("fire_time")
    private int fireTime;

    /**
     * Alarm recovery time
     * If the alarm status is firing, the value is 0.
     * If the alarm state is resolved, the value is the specific recovery time.
     */
    @JsonProperty("resolve_time")
    private int resolveTime;

    /**
     * Alarm status.
     * firing: Triggers an alarm.
     * resolved: Notification of resumption.
     */
    private String status;

    /**
     * The total number of entries in the data that triggered the alert,
     * which may be more than 100, for example after a Cartesian product operation.
     */
    @JsonProperty("fire_results_count")
    private int fireResultsCount;

    /**
     * Tag list
     * Example: {"env":"test"}
     */
    private Map<String, String> labels;

    /**
     * Labeled lists
     * Example: { "title": "Alarm title","desc": "Alarm desc" }
     */
    private Map<String, String> annotations;

    /**
     * Alarm severity.
     *
     * 10: Critical
     * 8: High
     * 6: Medium
     * 4: Low
     * 2: Report only
     */
    private int severity;

    /**
     *
     */
    @JsonProperty("signin_url")
    private String signinUrl;


    public String getAnnotation(String key) {
        if (null == this.annotations || this.annotations.isEmpty()) {
            return "N/A";
        }
        return this.annotations.get(key);
    }

    /**
     * Severity
     */
    public enum Severity {

        CRITICAL(10, "Critical"),

        HIGH(8, "High"),

        MEDIUM(6, "Medium"),

        LOW(4, "Low"),

        REPORT_ONLY(2, "Report only");

        private static final Map<Integer, Severity> STATUS_MAP;

        static {
            STATUS_MAP = Arrays.stream(Severity.values()).collect(Collectors.toMap(Severity::getStatus, t -> t,  (oldVal, newVal) -> newVal));
        }

        private final int status;
        private final String alias;

        Severity(int status, String alias) {
            this.status = status;
            this.alias = alias;
        }

        public static Optional<Severity> convert(int severity) {
            return Optional.ofNullable(STATUS_MAP.get(severity));
        }

        public int getStatus() {
            return status;
        }

        public String getAlias() {
            return alias;
        }
    }
}