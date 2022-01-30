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
import javax.validation.constraints.NotNull;

import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * 告警定义实体
 * @author tom
 * @date 2021/12/8 20:41
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
    @NotNull
    private String app;

    @ApiModelProperty(value = "配置告警的指标集合", example = "cpu", accessMode = READ_WRITE, position = 2)
    @Length(max = 100)
    @NotNull
    private String metric;

    @ApiModelProperty(value = "配置告警的指标", example = "usage", accessMode = READ_WRITE, position = 3)
    @Length(max = 100)
    @NotNull
    private String field;

    @ApiModelProperty(value = "是否是全局默认告警", example = "false", accessMode = READ_WRITE, position = 4)
    private boolean preset;

    @ApiModelProperty(value = "告警阈值触发条件表达式", example = "usage>90", accessMode = READ_WRITE, position = 5)
    @Length(max = 1024)
    private String expr;

    @ApiModelProperty(value = "告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色",
            example = "1", accessMode = READ_WRITE, position = 6)
    @Min(0)
    @Max(2)
    private byte priority;

    @ApiModelProperty(value = "阈值触发次数,即达到次数要求后才触发告警", example = "3", accessMode = READ_WRITE, position = 7)
    @Min(0)
    @Max(10)
    private int times;

    @ApiModelProperty(value = "告警阈值开关", example = "true", accessMode = READ_WRITE, position = 8)
    private boolean enable = true;

    @ApiModelProperty(value = "告警通知内容模版", example = "linux {monitor_name}: {monitor_id} cpu usage high",
            accessMode = READ_WRITE, position = 10)
    @Length(max = 1024)
    private String template;

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
