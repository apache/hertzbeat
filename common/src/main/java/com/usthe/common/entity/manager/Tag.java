package com.usthe.common.entity.manager;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.Objects;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * Tag
 * 标签
 *
 *
 */
@Entity
@Table(name = "hzb_tag")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "Tag Entity | 标签实体")
@EntityListeners(AuditingEntityListener.class)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "Tag主键索引ID", example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    @ApiModelProperty(value = "Tag Field | 标签名称", example = "app", accessMode = READ_WRITE, position = 1)
    @NotNull
    private String name;

    @ApiModelProperty(value = "Tag Value | 标签值", example = "23", accessMode = READ_WRITE, position = 2)
    @Column(name = "`value`")
    private String value;

    @ApiModelProperty(value = "Tag Color | 标签颜色", example = "#ffff", accessMode = READ_WRITE, position = 3)
    private String color;

    @ApiModelProperty(value = "标记类型 0:监控自动生成(monitorId,monitorName) 1: 用户生成 2: 系统预置", accessMode = READ_WRITE, position = 4)
    @Min(0)
    @Max(3)
    private byte type;

    @ApiModelProperty(value = "此条记录创建者", example = "tom", accessMode = READ_ONLY, position = 5)
    @CreatedBy
    private String creator;

    @ApiModelProperty(value = "此条记录最新修改者", example = "tom", accessMode = READ_ONLY, position = 6)
    @LastModifiedBy
    private String modifier;

    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 7)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @ApiModelProperty(value = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY, position = 8)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Tag tag = (Tag) o;
        return Objects.equals(name, tag.name) && Objects.equals(value, tag.value);
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 13 * hash + (name == null ? 0 : name.hashCode()) + (value == null ? 0 : value.hashCode());
        return hash;
    }
}
