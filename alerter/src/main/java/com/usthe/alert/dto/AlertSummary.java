package com.usthe.alert.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;

/**
 * Alarm Statistics Information  告警统计信息
 *
 * @author tom
 * @date 2022/3/6 19:25
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "en:Alarm Statistics Information,zh: 告警统计信息")
public class AlertSummary {

    @ApiModelProperty(value = "Total number of alerts (including processed and unprocessed alerts)",
            notes = "告警总数量(包括已处理未处理告警)",
            example = "134", accessMode = READ_ONLY, position = 0)
    private long total;

    @ApiModelProperty(value = "Number of alerts handled",
            notes = "已处理告警数量",
            example = "34", accessMode = READ_ONLY, position = 1)
    private long dealNum;

    @ApiModelProperty(value = "Alarm handling rate",
            notes = "告警处理率",
            example = "39.34", accessMode = READ_ONLY, position = 2)
    private float rate;

    @ApiModelProperty(value = "Number of alarms whose alarm severity is warning alarms (referring to unhandled alarms)",
            notes = "告警级别为警告告警的告警数量(指未处理告警)",
            example = "43", accessMode = READ_ONLY, position = 3)
    private long priorityWarningNum;

    @ApiModelProperty(value = "Number of alarms whose alarm severity is critical alarms (referring to unhandled alarms)",
            notes = "告警级别为严重告警的告警数量(指未处理告警)",
            example = "56", accessMode = READ_ONLY, position = 4)
    private long priorityCriticalNum;

    @ApiModelProperty(value = "Number of alarms whose alarm severity is urgent alarms (referring to unhandled alarms)",
            notes = "告警级别为紧急告警的告警数量(指未处理告警)", example = "23", accessMode = READ_ONLY, position = 5)
    private long priorityEmergencyNum;
}
