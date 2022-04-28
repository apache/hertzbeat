package com.usthe.common.entity.manager;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;

import javax.persistence.*;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * Tag
 * 标签
 * @author tomsun28
 * @date 2021/11/13 22:19
 */
@Entity
@Table(name = "tag")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "Tag Entity | 标签实体")
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "Tag主键索引ID", example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    @ApiModelProperty(value = "Tag Field | 标签名称", example = "app", accessMode = READ_WRITE, position = 1)
    @NotNull
    private String name;

    @ApiModelProperty(value = "Tag Value | 标签值", example = "23", accessMode = READ_WRITE, position = 2)
    private String field;

    @ApiModelProperty(value = "参数值", example = "8080", accessMode = READ_WRITE, position = 3)
    @Length(max = 8126)
    private String value;

    @ApiModelProperty(value = "标记类型 0:监控自动生成(monitorId,monitorName) 1: 用户生成", accessMode = READ_WRITE, position = 4)
    @Min(0)
    @Max(3)
    private byte type;

    @ApiModelProperty(value = "此条记录创建者", example = "tom", accessMode = READ_ONLY, position = 5)
    private String creator;

    @ApiModelProperty(value = "此条记录最新修改者", example = "tom", accessMode = READ_ONLY, position = 6)
    private String modifier;

    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 7)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtCreate;

    @ApiModelProperty(value = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY, position = 8)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtUpdate;

}
