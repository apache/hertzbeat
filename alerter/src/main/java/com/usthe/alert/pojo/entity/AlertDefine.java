package com.usthe.alert.pojo.entity;

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

import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * 告警定义实体
 *
 *
 */
@Entity
@Table(name = "alert_define")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "告警定义实体")
public class AlertDefine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "告警定义实体主键索引ID", example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    @ApiModelProperty(value = "配置告警的监控类型", example = "linux", accessMode = READ_WRITE, position = 1)
    @Length(max = 100)
    private String app;

    @ApiModelProperty(value = "配置告警的指标集合", example = "cpu", accessMode = READ_WRITE, position = 2)
    @Length(max = 100)
    private String metric;

    @ApiModelProperty(value = "配置告警的指标", example = "usage", accessMode = READ_WRITE, position = 3)
    @Length(max = 100)
    private String field;

    @ApiModelProperty(value = "是否是默认预置告警", example = "false", accessMode = READ_WRITE, position = 4)
    private boolean preset;

    @ApiModelProperty(value = "告警触发条件表达式", example = "usage>90", accessMode = READ_WRITE, position = 5)
    @Length(max = 1024)
    private String expr;

    @ApiModelProperty(value = "告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色",
            example = "1", accessMode = READ_WRITE, position = 6)
    @Min(0)
    @Max(2)
    private byte priority;

    @ApiModelProperty(value = "触发告警后持续时间,单位s", example = "60", accessMode = READ_WRITE, position = 7)
    @Min(0)
    private int duration;

    @ApiModelProperty(value = "告警触发后是否发送", example = "true", accessMode = READ_WRITE, position = 8)
    private boolean enable = true;

    @ApiModelProperty(value = "告警延迟时间,即延迟多久再发送告警,单位s", example = "300", accessMode = READ_WRITE, position = 9)
    @Min(0)
    private int delay;

    @ApiModelProperty(value = "告警通知内容", example = "linux {monitor_name}: {monitor_id} cpu usage high",
            accessMode = READ_WRITE, position = 10)
    @Length(max = 1024)
    private String content;

    /**
     * 此条记录创建者
     */
    @ApiModelProperty(value = "此条记录创建者", example = "tom", accessMode = READ_ONLY, position = 11)
    private String creator;

    /**
     * 此条记录最新修改者
     */
    @ApiModelProperty(value = "此条记录最新修改者", example = "tom", accessMode = READ_ONLY, position = 12)
    private String modifier;

    /**
     * 记录创建时间
     */
    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 13)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtCreate;

    /**
     * 记录最新修改时间
     */
    @ApiModelProperty(value = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY, position = 14)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtUpdate;

}
