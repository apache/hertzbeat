package org.dromara.hertzbeat.alert.dto;


import java.time.OffsetDateTime;

@lombok.Data
public class TenCloudAlertReport {
    private String sessionID;
    private String alarmStatus;
    private String alarmType;
    private AlarmObjInfo alarmObjInfo;
    private AlarmPolicyInfo alarmPolicyInfo;
    private OffsetDateTime firstOccurTime;
    private long durationTime;
    private OffsetDateTime recoverTime;

    @lombok.Data
    public class AlarmObjInfo {
        private String region;
        private String namespace;
        private String appID;
        private String uin;
        private Dimensions dimensions;
    }

    @lombok.Data
    public class Dimensions {
        private String unInstanceID;
        private String objID;
    }
    @lombok.Data
    public class AlarmPolicyInfo {
        private String policyID;
        private String policyType;
        private String policyName;
        private String policyTypeCName;
        private Conditions conditions;
    }
    @lombok.Data
    public class Conditions {
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


