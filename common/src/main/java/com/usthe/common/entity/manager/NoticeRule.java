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
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * Notification strategy entity
 * 通知策略
 *
 * @author tomsun28
 * @date 2021/11/13 22:19
 */
@Entity
@Table(name = "notice_rule")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "en: Notify Policy Entity,zh: 通知策略实体")
public class NoticeRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "Notification Policy Entity Primary Key Index ID",
            notes = "通知策略实体主键索引ID",
            example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    @ApiModelProperty(value = "Policy name",
            notes = "策略名称",
            example = "dispatch-1", accessMode = READ_WRITE, position = 1)
    @Length(max = 100)
    @NotNull
    private String name;

    @ApiModelProperty(value = "Recipient ID",
            notes = "接收人ID",
            example = "4324324", accessMode = READ_WRITE, position = 2)
    @NotNull
    private Long receiverId;

    @ApiModelProperty(value = "Recipient identification",
            notes = "接收人标识",
            example = "tom", accessMode = READ_WRITE, position = 3)
    @Length(max = 100)
    @NotNull
    private String receiverName;

    @ApiModelProperty(value = "Whether to enable this policy",
            notes = "是否启用此策略",
            example = "true", accessMode = READ_WRITE, position = 4)
    private boolean enable = true;

    @ApiModelProperty(value = "Whether to forward all",
            notes = "是否转发所有",
            example = "false", accessMode = READ_WRITE, position = 5)
    private boolean filterAll = true;

    @ApiModelProperty(value = "The creator of this record",
            notes = "此条记录创建者",
            example = "tom", accessMode = READ_ONLY, position = 7)
    private String creator;

    @ApiModelProperty(value = "This record was last modified by",
            notes = "此条记录最新修改者",
            example = "tom", accessMode = READ_ONLY, position = 8)
    private String modifier;

    @ApiModelProperty(value = "This record creation time (millisecond timestamp)",
            notes = "记录创建时间(毫秒时间戳)",
            example = "1612198922000", accessMode = READ_ONLY, position = 9)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtCreate;

    @ApiModelProperty(value = "Record the latest modification time (timestamp in milliseconds)",
            notes = "记录最新修改时间(毫秒时间戳)",
            example = "1612198444000", accessMode = READ_ONLY, position = 10)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtUpdate;

}
