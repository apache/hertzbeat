package com.usthe.manager.pojo.entity;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * 监控参数定义
 * @author tomsun28
 * @date 2021/11/13 21:49
 */
@Entity
@Table(name = "param_define")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "参数结构定义实体")
public class ParamDefine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "参数结构ID", example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    /**
     * 监控应用类型名称
     */
    @ApiModelProperty(value = "监控类型", example = "api", accessMode = READ_WRITE, position = 1)
    private String app;

    /**
     * 参数字段对外显示名称
     */
    @ApiModelProperty(value = "参数字段显示名称", example = "端口", accessMode = READ_WRITE, position = 2)
    private String name;

    /**
     * 参数字段标识符
     */
    @ApiModelProperty(value = "参数字段标识符", example = "port", accessMode = READ_WRITE, position = 3)
    private String field;

    /**
     * 字段类型,样式(大部分映射input标签type属性)
     */
    @ApiModelProperty(value = "字段类型,样式(大部分映射input标签type属性)", example = "number", accessMode = READ_WRITE, position = 4)
    private String type;

    /**
     * 当type为number时,用range表示范围 eg: 0-233
     */
    @ApiModelProperty(value = "当type为number时,用range表示范围", example = "0-233", accessMode = READ_WRITE, position = 5)
    @Column(name = "param_range")
    private String range;

    /**
     * 当type为text时,用limit表示字符串限制大小.最大255
     */
    @ApiModelProperty(value = "当type为text时,用limit表示字符串限制大小.最大255", example = "30", accessMode = READ_WRITE, position = 6)
    @Column(name = "param_limit")
    private short limit;

    /**
     * 当type为radio单选框,checkbox复选框时,option表示可选项值列表
     * eg: param3,param4,param5
     */
    @ApiModelProperty(value = "当type为radio单选框,checkbox复选框时,option表示可选项值列表", example = "10,20,30", accessMode = READ_WRITE, position = 7)
    @Column(name = "param_option")
    private String option;

    /**
     * 此条记录创建者
     */
    @ApiModelProperty(value = "此条记录创建者", example = "tom", accessMode = READ_ONLY, position = 8)
    private String creator;

    /**
     * 此条记录最新修改者
     */
    @ApiModelProperty(value = "此条记录最新修改者", example = "tom", accessMode = READ_ONLY, position = 9)
    private String modifier;

    /**
     * 记录创建时间
     */
    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 10)
    private LocalDateTime gmtCreate;

    /**
     * 记录最新修改时间
     */
    @ApiModelProperty(value = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY, position = 11)
    private LocalDateTime gmtUpdate;
}
