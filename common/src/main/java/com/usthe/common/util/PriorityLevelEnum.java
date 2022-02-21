package com.usthe.common.util;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 *
 * @version 1.0
 *
 * @Description
 */
@AllArgsConstructor
@Getter
public enum PriorityLevelEnum {

    EMERGENCY(0,"紧急告警"),
    CRITICAL(1,"严重告警"),
    WARNING(2,"警告告警"),
    ;
    private Integer level;
    private String message;
}
