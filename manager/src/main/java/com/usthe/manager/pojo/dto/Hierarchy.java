package com.usthe.manager.pojo.dto;

import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * 层级关系结构
 * eg: 监控类型指标组指标信息层级关系
 * @author tom
 * @date 2021/12/12 16:23
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
public class Hierarchy {

    @ApiModelProperty(value = "类别值", example = "os", accessMode = READ_WRITE, position = 0)
    String category;

    @ApiModelProperty(value = "属性值", example = "linux", accessMode = READ_WRITE, position = 1)
    String value;

    @ApiModelProperty(value = "属性国际化标签", example = "Linux系统", accessMode = READ_WRITE, position = 2)
    String label;

    @ApiModelProperty(value = "是否是叶子节点", example = "true", accessMode = READ_WRITE, position = 3)
    Boolean isLeaf = false;

    @ApiModelProperty(value = "下一关联层级", accessMode = READ_WRITE, position = 4)
    private List<Hierarchy> children;
}
