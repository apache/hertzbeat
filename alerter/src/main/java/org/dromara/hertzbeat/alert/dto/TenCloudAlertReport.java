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

package org.dromara.hertzbeat.alert.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.dromara.hertzbeat.alert.util.DateUtil;

import java.io.Serializable;
import java.util.Map;

/**
 * @author zqr10159
 * 腾讯云告警实体类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Builder
public class TenCloudAlertReport extends CloudAlertReportAbstract implements Serializable {
    @JsonProperty("sessionID")
    private String sessionId;
    private String alarmStatus;
    private String alarmType;
    private AlarmObjInfo alarmObjInfo;
    private AlarmPolicyInfo alarmPolicyInfo;
    private String firstOccurTime;
    private int durationTime;
    private String recoverTime;

    /**
     * Alarm Object information
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AlarmObjInfo {
        private String region;
        private String namespace;
        @JsonProperty("appID")
        private String appId;
        private String uin;
        private Dimensions dimensions;
    }

    /**
     *  Uniform Resource ID information
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Dimensions {
        @JsonProperty("unInstanceID")
        private String unInstanceId;
        @JsonProperty("objID")
        private String objId;
    }

    /**
     * Alarm policy information
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AlarmPolicyInfo {
        @JsonProperty("policyID")
        private String policyId;
        private String policyType;
        private String policyName;
        @JsonProperty("policyTypeCName")
        private String policyTypeCname;
        private Conditions conditions;
    }

    /**
     * Parameters of indicator alarms
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Conditions {
        // 指标告警的参数
        private String metricName;
        private String metricShowName;
        private String calcType;
        private String calcValue;
        private String calcUnit;
        private String currentValue;
        private String historyValue;
        private String unit;
        private String period;
        private String periodNum;
        private String alarmNotifyType;
        private long alarmNotifyPeriod;

        // 事件告警的参数
        private String productName;
        private String productShowName;
        private String eventName;
        private String eventShowName;
    }

    @Override
    public String getAlertName() {
        return "TenCloud|腾讯云";
    }

    @Override
    public Integer getAlertDuration() {
        return this.durationTime;
    }

    @Override
    public long getAlertTime() {
        return DateUtil.getTimeStampFromFormat(getFirstOccurTime(), "yyyy-MM-dd HH:mm:ss");
    }

    @Override
    public Integer getPriority() {
        return 1;
    }

    @Override
    public Integer getReportType() {
        return 1;
    }

    @Override
    public Map<String, String> getLabels() {
        return Map.of("app", "TenCloud");
    }

    @Override
    public Map<String, String> getAnnotations() {
        return Map.of("app", "TenCloud");
    }

    /**
     * 事务告警
     */
    private static final String EVENT = "event";

    /**
     * 指标告警
     */
    private static final String METRIC = "metric";

    /**
     * 如果后续腾讯云告警类型增多的话，可以将该实体类拆分为一个父类和多个子类，然后在子类实现该方法即可
     * 由于目前只有两种，暂不进行拆分
     */
    @Override
    public String getContent() {
        StringBuilder contentBuilder = new StringBuilder();
        // 判断类型
        if (EVENT.equals(getAlarmType())) {
            contentBuilder
                    .append("[")
                    .append("告警状态 | ")
                    .append("0".equals(alarmStatus) ? "恢复" : "告警")
                    .append("]\n")
                    .append("[")
                    .append("告警对象信息 | ")
                    .append(getAlarmObjInfo().getRegion() == null ? "" : "region:" + getAlarmObjInfo().getRegion())
                    .append(";").append("appId:").append(getAlarmObjInfo().getAppId())
                    .append(";").append("uni:").append(getAlarmObjInfo().getUin())
                    .append(";").append("unInstanceId:").append(getAlarmObjInfo().getDimensions().getUnInstanceId())
                    .append("]\n")
                    .append("[")
                    .append("告警策略组信息 | ")
                    .append("名称：").append(getAlarmPolicyInfo().getPolicyName())
                    .append(";")
                    .append("策略类型展示名称：").append(getAlarmPolicyInfo().getConditions().getProductName())
                    .append(",").append(getAlarmPolicyInfo().getConditions().getProductShowName())
                    .append(";")
                    .append("事件告警名称：").append(getAlarmPolicyInfo().getConditions().getEventName())
                    .append(",").append(getAlarmPolicyInfo().getConditions().getEventShowName())
                    .append("]");
        } else if (METRIC.equals(getAlarmType())) {
            contentBuilder
                    .append("[")
                    .append("告警对象：")
                    .append(getAlarmObjInfo().getRegion() == null ? "" : getAlarmObjInfo().getRegion())
                    .append(getAlarmObjInfo().getRegion() == null ? "" : "|")
                    .append(getAlarmObjInfo().getNamespace())
                    .append("]")
                    .append("[")
                    .append("告警内容：")
                    .append(getAlarmPolicyInfo().getPolicyTypeCname()).append("|")
                    .append(getAlarmPolicyInfo().getConditions().getMetricShowName()).append("|")
                    .append(getAlarmPolicyInfo().getConditions().getMetricName())
                    .append(getAlarmPolicyInfo().getConditions().getCalcType())
                    .append(getAlarmPolicyInfo().getConditions().getCalcValue())
                    .append(getAlarmPolicyInfo().getConditions().getCalcUnit())
                    .append("]")
                    .append("[")
                    .append("当前数据")
                    .append(getAlarmPolicyInfo().getConditions().getCurrentValue())
                    .append(getAlarmPolicyInfo().getConditions().getCalcUnit())
                    .append("]");
        }
        return contentBuilder.toString();
    }

}


