package com.usthe.common.entity.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 监控指标组的一行指标数据
 * @author tom
 * @date 2021/12/5 17:39
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "监控指标组的一行指标数据")
public class ValueRow {

    @ApiModelProperty(value = "此行数据唯一实例", position = 0)
    private String instance;

    @ApiModelProperty(value = "监控指标组指标值", position = 1)
    private List<Value> values;
}
