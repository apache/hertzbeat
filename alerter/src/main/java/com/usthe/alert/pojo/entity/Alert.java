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
 * 告警记录
 *
 *
 */
@Entity
@Table(name = "alert")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "告警记录实体")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "告警记录实体主键索引ID", example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    @ApiModelProperty(value = "告警监控对象ID", example = "87432674336", accessMode = READ_WRITE, position = 1)
    private Long monitorId;

    @ApiModelProperty(value = "告警监控对象名称", example = "87432674336", accessMode = READ_WRITE, position = 2)
    private String monitorName;

    @ApiModelProperty(value = "告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色",
            example = "1", accessMode = READ_WRITE, position = 3)
    @Min(0)
    @Max(2)
    private byte priority;

    @ApiModelProperty(value = "告警状态: 0-待发送 1-已发送 2-已过期(已经超过持续时间)",
            example = "1", accessMode = READ_WRITE, position = 4)
    @Min(0)
    @Max(2)
    private byte status;

    @ApiModelProperty(value = "告警目标对象: 监控可用性-available 指标-app.metrics.field",
            example = "1", accessMode = READ_WRITE, position = 4)
    @Min(0)
    @Max(2)
    private String target;

    @ApiModelProperty(value = "触发告警后持续时间,单位s", example = "60", accessMode = READ_WRITE, position = 7)
    @Min(0)
    private int duration;

    @ApiModelProperty(value = "告警通知实际内容", example = "linux_192.134.32.1: 534543534 cpu usage high",
            accessMode = READ_WRITE, position = 10)
    @Length(max = 1024)
    private String content;

    /**
     * 记录创建时间
     */
    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 13)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtCreate;

}
