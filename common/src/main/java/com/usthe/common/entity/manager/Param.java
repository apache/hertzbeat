package com.usthe.common.entity.manager;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * Monitor parameter values
 * 监控参数值
 *
 * @author tomsun28
 * @date 2021/11/13 22:19
 */
@Entity
@Table(name = "param")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "嗯： Parameter Entity,zh: 参数实体")
public class Param {

    /**
     * Parameter primary key index ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "参数主键索引ID", example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    /**
     * Monitor ID
     * 监控ID
     */
    @ApiModelProperty(value = "监控ID", example = "875846754543", accessMode = READ_WRITE, position = 1)
    private Long monitorId;

    /**
     * Parameter Field Identifier
     * 参数字段标识符
     */
    @ApiModelProperty(value = "参数标识符字段", example = "port", accessMode = READ_WRITE, position = 2)
    @Length(max = 100)
    @NotNull
    private String field;

    /**
     * Param Value
     * 参数值
     */
    @ApiModelProperty(value = "参数值", example = "8080", accessMode = READ_WRITE, position = 3)
    @Length(max = 8126)
    private String value;

    /**
     * Parameter type 0: number 1: string 2: encrypted string 3: json string mapped by map
     * 参数类型 0:数字 1:字符串 2:加密串 3:map映射的json串
     */
    @ApiModelProperty(value = "参数类型 0:数字 1:字符串 2:加密串 3:map映射的json串", accessMode = READ_WRITE, position = 4)
    @Min(0)
    @Max(3)
    private byte type;

    /**
     * Record Creation Time
     * 记录创建时间
     */
    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 5)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtCreate;

    /**
     * Record the latest modification time
     * 记录最新修改时间
     */
    @ApiModelProperty(value = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY, position = 6)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtUpdate;

}
