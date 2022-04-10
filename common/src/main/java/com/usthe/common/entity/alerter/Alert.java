package com.usthe.common.entity.alerter;

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
 * Alarm record entity 告警记录实体
 *
 * @author tom
 * @date 2021/12/9 15:37
 */
@Entity
@Table(name = "alert")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "en: Alarm record entity zh: 告警记录实体")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "Alarm record entity primary key index ID",
            notes = "告警记录实体主键索引ID",
            example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    @ApiModelProperty(value = "Alert target object: monitor availability-available metrics-app.metrics.field",
            notes = "告警目标对象: 监控可用性-available 指标-app.metrics.field",
            example = "1", accessMode = READ_WRITE, position = 1)
    @Length(max = 255)
    private String target;

    @ApiModelProperty(value = "Monitoring ID associated with the alarm object",
            notes = "告警对象关联的监控ID",
            example = "87432674336", accessMode = READ_WRITE, position = 2)
    private Long monitorId;

    @ApiModelProperty(value = "Monitoring name associated with the alarm object",
            notes = "告警对象关联的监控名称",
            example = "Linux_192.132.23.1", accessMode = READ_WRITE, position = 3)
    private String monitorName;

    @ApiModelProperty(value = "Alarm definition ID associated with the alarm",
            notes = "告警关联的告警定义ID",
            example = "8743267443543", accessMode = READ_WRITE, position = 4)
    private Long alertDefineId;

    @ApiModelProperty(value = "Alarm level 0: high-emergency-critical alarm-red 1: medium-critical-critical alarm-orange 2: low-warning-warning alarm-yellow",
            notes = "告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色",
            example = "1", accessMode = READ_WRITE, position = 5)
    @Min(0)
    @Max(2)
    private byte priority;

    @ApiModelProperty(value = "The actual content of the alarm notification",
            notes = "告警通知实际内容",
            example = "linux_192.134.32.1: 534543534 cpu usage high",
            accessMode = READ_WRITE, position = 6)
    @Length(max = 1024)
    private String content;

    @ApiModelProperty(value = "Alarm status: 0-normal alarm (to be processed) 1-threshold triggered but not reached the number of alarms 2-recovered alarm 3-processed",
            notes = "告警状态: 0-正常告警(待处理) 1-阈值触发但未达到告警次数 2-恢复告警 3-已处理",
            example = "1", accessMode = READ_WRITE, position = 7)
    @Min(0)
    @Max(2)
    private byte status;

    @ApiModelProperty(value = "Alarm threshold trigger times",
            notes = "告警阈值触发次数",
            example = "3", accessMode = READ_WRITE, position = 8)
    @Min(0)
    @Max(10)
    private int times;

    @ApiModelProperty(value = "Alarm trigger time (timestamp in milliseconds)",
            notes = "告警触发时间(毫秒时间戳)",
            example = "1612198922000", accessMode = READ_ONLY, position = 9)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtCreate;

}
