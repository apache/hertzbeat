package com.usthe.manager.pojo.dto;

import com.usthe.manager.pojo.entity.Monitor;
import com.usthe.manager.pojo.entity.Param;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotNull;
import java.util.List;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * 监控信息对外交互实体
 *
 *
 */
@Data
@ApiModel(description = "监控信息实体")
public class MonitorDto {

    /**
     * 监控实体
     */
    @ApiModelProperty(value = "监控实体", accessMode = READ_WRITE, position = 0)
    @NotNull
    private Monitor monitor;

    /**
     * 参数
     */
    @ApiModelProperty(value = "监控参数", accessMode = READ_WRITE, position = 1)
    @NotNull
    private List<Param> params;

    /**
     * 是否探测
     */
    @ApiModelProperty(value = "是否进行探测", accessMode = READ_WRITE, position = 2)
    private Boolean detected;
}
