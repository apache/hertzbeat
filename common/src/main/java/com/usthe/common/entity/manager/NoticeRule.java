package com.usthe.common.entity.manager;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

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

    @ApiModelProperty(value = "过滤匹配告警级别，空为全部告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色", example = "[1]", accessMode = READ_WRITE, position = 8)
    @Convert(converter = JsonByteListAttributeConverter.class)
    private List<Byte> priorities;

    @ApiModelProperty(value = "告警信息标签(monitorId:xxx,monitorName:xxx)", example = "{name: key1, value: value1}", accessMode = READ_WRITE, position = 8)
    @Convert(converter = JsonTagListAttributeConverter.class)
    private List<TagItem> tags;

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


    @AllArgsConstructor
    @NoArgsConstructor
    @Data
    public static class TagItem {

        @ApiModelProperty(value = "Tag Name")
        @NotBlank
        private String name;

        @ApiModelProperty(value = "Tag Value")
        private String value;
    }
}
