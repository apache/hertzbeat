package com.usthe.common.entity.manager;


import com.usthe.common.support.valid.HostValid;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * Monitor Entity
 * 监控实体
 *
 * @author tomsun28
 * @date 2021/11/14 9:53
 */
@Entity
@Table(name = "monitor")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "en: Monitor Entity,zh: 监控实体")
public class Monitor {

    /**
     * Monitor ID
     * 主键ID
     */
    @Id
    @ApiModelProperty(value = "监控ID", example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    /**
     * Job ID
     * 监控对应下发的任务ID
     */
    @ApiModelProperty(value = "任务ID", example = "43243543543", accessMode = READ_ONLY, position = 1)
    private Long jobId;

    /**
     * Monitor Name
     * 监控的名称
     */
    @ApiModelProperty(value = "监控名称", example = "Api-TanCloud.cn", accessMode = READ_WRITE, position = 2)
    @Length(max = 100)
    private String name;

    /**
     * Type of monitoring: linux, mysql, jvm...
     * 监控的类型:linux,mysql,jvm...
     */
    @ApiModelProperty(value = "监控类型", example = "TanCloud", accessMode = READ_WRITE, position = 3)
    @Length(max = 100)
    private String app;

    /**
     * Monitored peer host: ipv4, ipv6, domain name
     * 监控的对端host:ipv4,ipv6,域名
     */
    @ApiModelProperty(value = "监控的对端host", example = "192.167.25.11", accessMode = READ_WRITE, position = 4)
    @Length(max = 100)
    @HostValid
    private String host;

    /**
     * Monitoring collection interval time, in seconds
     * 监控的采集间隔时间,单位秒
     */
    @ApiModelProperty(value = "监控的采集间隔时间,单位秒", example = "600", accessMode = READ_WRITE, position = 5)
    @Min(10)
    private Integer intervals;

    /**
     * Monitoring status 0: Unmonitored, 1: Available, 2: Unavailable, 3: Unreachable, 4: Suspended
     * 监控状态 0:未监控,1:可用,2:不可用,3:不可达,4:挂起
     */
    @ApiModelProperty(value = "监控状态 0:未监控,1:可用,2:不可用,3:不可达,4:挂起", accessMode = READ_WRITE, position = 6)
    @Min(0)
    @Max(4)
    private byte status;

    /**
     * Monitoring note description
     * 监控备注描述
     */
    @ApiModelProperty(value = "监控备注描述", example = "对SAAS网站TanCloud的可用性监控", accessMode = READ_WRITE, position = 7)
    @Length(max = 255)
    private String description;

    /**
     * The creator of this record
     * 此条记录创建者
     */
    @ApiModelProperty(value = "此条记录创建者", example = "tom", accessMode = READ_ONLY, position = 8)
    private String creator;

    /**
     * This record was last modified by
     * 此条记录最新修改者
     */
    @ApiModelProperty(value = "此条记录最新修改者", example = "tom", accessMode = READ_ONLY, position = 9)
    private String modifier;

    /**
     * record creation time (millisecond timestamp)
     * 记录创建时间
     */
    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 10)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtCreate;

    /**
     * Record the latest modification time (timestamp in milliseconds)
     * 记录最新修改时间
     */
    @ApiModelProperty(value = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY, position = 11)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtUpdate;

}
