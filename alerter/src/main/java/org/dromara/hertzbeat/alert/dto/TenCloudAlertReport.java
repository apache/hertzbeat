package org.dromara.hertzbeat.alert.dto;


import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * @author zqr10159
 * 腾讯云告警实体类
 */
@lombok.Data
@AllArgsConstructor
@NoArgsConstructor
public class TenCloudAlertReport implements Serializable {
    private String sessionID;
    private String alarmStatus;
    private String alarmType;
    private AlarmObjInfo alarmObjInfo;
    private AlarmPolicyInfo alarmPolicyInfo;
    private String firstOccurTime;
    private int durationTime;
    private String recoverTime;

    @lombok.Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AlarmObjInfo {
        private String region;
        private String namespace;
        private String appID;
        private String uin;
        private Dimensions dimensions;
    }

    @lombok.Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Dimensions {
        private String unInstanceID;
        private String objID;
    }
    @lombok.Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AlarmPolicyInfo {
        private String policyID;
        private String policyType;
        private String policyName;
        private String policyTypeCName;
        private Conditions conditions;
    }
    @lombok.Data
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


