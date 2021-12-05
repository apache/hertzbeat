package com.usthe.common.entity.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 指标组监控数据
 * @author tom
 * @date 2021/12/5 17:24
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "指标组监控数据")
public class MetricsData {

    @ApiModelProperty(value = "监控ID", position = 0)
    private Long id;

    @ApiModelProperty(value = "监控类型", position = 1)
    private String app;

    @ApiModelProperty(value = "监控指标组", position = 2)
    private String metric;

    @ApiModelProperty(value = "最新采集时间", position = 3)
    private Long time;

    @ApiModelProperty(value = "监控指标字段列表", position = 4)
    private List<Field> fields;

    @ApiModelProperty(value = "监控指标列表值集合")
    private List<ValueRow> valueRows;
}
