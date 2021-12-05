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

    @ApiModelProperty(value = "原始值", position = 0)
    private String origin;

    @ApiModelProperty(value = "平均值", position = 1)
    private String mean;

    @ApiModelProperty(value = "中位数值", position = 0)
    private String median;

    @ApiModelProperty(value = "最小值", position = 0)
    private String min;

    @ApiModelProperty(value = "最大值", position = 0)
    private String max;
}
