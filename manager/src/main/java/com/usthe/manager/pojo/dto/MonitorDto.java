package com.usthe.manager.pojo.dto;

import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.entity.manager.Param;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.util.List;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * Monitoring Information External Interaction Entities
 * 监控信息对外交互实体
 *
 * @author tomsun28
 * @date 2021/11/14 10:13
 */
@Data
@ApiModel(description = "en: Monitoring information entities,zh: 监控信息实体")
public class MonitorDto {

    /**
     * Monitoring entity
     * 监控实体
     */
    @ApiModelProperty(value = "监控实体", accessMode = READ_WRITE, position = 0)
    @NotNull
    @Valid
    private Monitor monitor;

    /**
     * Params 参数
     */
    @ApiModelProperty(value = "监控参数", accessMode = READ_WRITE, position = 1)
    @NotNull
    @Valid
    private List<Param> params;

    /**
     * List of indicator groups
     * 指标组列表
     */
    @ApiModelProperty(value = "指标组列表", accessMode = READ_ONLY, position = 2)
    private List<String> metrics;

    /**
     * Whether to detect
     * 是否探测
     */
    @ApiModelProperty(value = "是否进行探测", accessMode = READ_WRITE, position = 3)
    private boolean detected;
}
