package org.dromara.hertzbeat.alert.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.io.Serializable;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Map;

/**
 *
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

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Dimensions {
        @JsonProperty("unInstanceID")
        private String unInstanceId;
        @JsonProperty("objID")
        private String objId;
    }
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
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Conditions {
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
    public long getAlertTime() throws ParseException {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        long occurTime;
        occurTime = sdf.parse(getFirstOccurTime()).getTime();
        return occurTime;
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

    @Override
    public String getContent() {
        StringBuilder contentBuilder = new StringBuilder();
       return contentBuilder
                .append("[")
                .append("告警对象：地区")
                .append(getAlarmObjInfo().getRegion()).append("|")
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
                .append("]")
                .toString();
    }

}


