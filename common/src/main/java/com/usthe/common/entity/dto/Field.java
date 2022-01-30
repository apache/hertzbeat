package com.usthe.common.entity.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 监控指标组指标字段
 * @author tom
 * @date 2021/12/5 17:29
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "监控指标组指标字段")
public class Field {

    @ApiModelProperty(value = "指标采集字符名称", position = 0)
    private String name;

    @ApiModelProperty(value = "字段类型：0-number数字 1-string字符串", position = 1)
    private Byte type;

    @ApiModelProperty(value = "指标单位", position = 2)
    private String unit;

    @ApiModelProperty(value = "是否是实例字段", position = 3)
    private Boolean instance;

}
