package com.usthe.common.entity.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 监控指标组指标值
 * @author tom
 * @date 2021/12/5 17:43
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "监控指标组指标值")
public class Value {

    public Value(String origin) {
        this.origin = origin;
    }

    public Value(String origin, long time) {
        this.origin = origin;
        this.time = time;
    }

    @ApiModelProperty(value = "原始值", position = 0)
    private String origin;

    @ApiModelProperty(value = "平均值", position = 1)
    private String mean;

    @ApiModelProperty(value = "中位数值,暂不支持", position = 2)
    private String median;

    @ApiModelProperty(value = "最小值", position = 3)
    private String min;

    @ApiModelProperty(value = "最大值", position = 4)
    private String max;

    @ApiModelProperty(value = "数据采集时间,此字段查历史数据时有效", position = 5)
    private Long time;
}
