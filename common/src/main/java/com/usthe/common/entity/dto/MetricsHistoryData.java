package com.usthe.common.entity.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 历史单指标数据
 * @author tom
 * @date 2022/1/21 09:58
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "历史单指标数据")
public class MetricsHistoryData {

    @ApiModelProperty(value = "监控ID", position = 0)
    private Long id;

    @ApiModelProperty(value = "监控类型", position = 1)
    private String app;

    @ApiModelProperty(value = "监控指标组", position = 2)
    private String metric;

    @ApiModelProperty(value = "监控指标", position = 4)
    private Field field;

    @ApiModelProperty(value = "监控指标历史值 instance<==>values", position = 5)
    private Map<String, List<Value>> values;
}
