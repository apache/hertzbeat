package com.usthe.common.util;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * @author 花城
 * @version 1.0
 * @date 2022/2/21 7:07 下午
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
