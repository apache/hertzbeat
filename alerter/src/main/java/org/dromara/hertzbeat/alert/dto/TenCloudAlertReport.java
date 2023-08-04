package org.dromara.hertzbeat.alert.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * @author zqr10159
 * 腾讯云告警实体类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TenCloudAlertReport implements Serializable {
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

}


