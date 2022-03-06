package com.usthe.alert.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 监控级别告警数量
 *
 *
 */
@Data
@AllArgsConstructor
public class AlertPriorityNum {

    private byte priority;

    private long num;
}
