package com.usthe.common.entity.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * 告警 对外上报实体类
 * @author yuye
 * @date 2022/04/30
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "告警对外上报字段")
public class AlertReport {

    @ApiModelProperty(value = "Alert record saas index ID", position = 0)
    private String alertId;

    @ApiModelProperty(value = "Alert Name", position = 1)
    private String alertName;

    @ApiModelProperty(value = "Alarm evaluation interval", position = 2)
    private Integer alertDuration;

    @ApiModelProperty(value = "Time when the log service receives the alarm message", notes = "日志服务接收到告警消息的时间", example = "1648889320", accessMode = READ_WRITE, position = 3)
    private long alertTime;

    @ApiModelProperty(value = "Alarm priority. 0: high emergency alarm red 1: medium critical serious alarm Orange 2: low warning warning alarm yellow", notes = "告警严重度。0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色", example = "1", accessMode = READ_WRITE, position = 4)
    private Integer priority;

    @ApiModelProperty(value = "Alarm type. 0: the default 1 is business system exception reporting", notes = "告警类型。0:内部告警 1:外部系统上报", example = "0", accessMode = READ_WRITE, position = 5)
    private Integer reportType;

    @ApiModelProperty(value = "Alarm tag information", notes = "告警标签信息((monitorId:xxx,monitorName:xxx))", example = "{key1:value1}", accessMode = READ_WRITE, position = 6)
    private Map<String, String> labels;

    @ApiModelProperty(value = " Alarm marking (monitorId:xxx,monitorName:xxx)", notes = "告警标注", example = "{key1:value1}", accessMode = READ_WRITE, position = 7)
    private Map<String, String> annotations;

    @ApiModelProperty(value = " Alarm content", notes = "告警内容", example = "对外报警内容", accessMode = READ_WRITE, position = 8)
    private String content;

}
