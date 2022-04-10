package com.usthe.alert.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Number of monitoring level alarms 监控级别告警数量
 *
 * @author tom
 * @date 2022/3/6 19:52
 */
@Data
@AllArgsConstructor
public class AlertPriorityNum {

    /**
     * Alarm level 告警级别
     */
    private byte priority;

    /**
     * count 数量
     */
    private long num;
}
