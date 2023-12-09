/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.dromara.hertzbeat.common.entity.manager;

import org.dromara.hertzbeat.common.support.valid.HostValid;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDateTime;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Monitor Entity
 * @author tomsun28
 */
@Entity
@Table(name = "hzb_monitor", indexes = {
        @Index(name = "monitor_query_index", columnList = "app"),
        @Index(name = "monitor_query_index", columnList = "host"),
        @Index(name = "monitor_query_index", columnList = "name")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Monitor Entity | 监控实体")
@EntityListeners(AuditingEntityListener.class)
public class Monitor {

    /**
     * Monitor ID
     */
    @Id
    @Schema(title = "监控任务ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    /**
     * Job ID
     */
    @Schema(title = "采集任务ID", example = "43243543543", accessMode = READ_ONLY)
    private Long jobId;

    /**
     * Monitor Name
     */
    @Schema(title = "任务名称", example = "Api-TanCloud.cn", accessMode = READ_WRITE)
    @Length(max = 100)
    private String name;

    /**
     * Type of monitoring: linux, mysql, jvm...
     * 监控的类型:linux,mysql,jvm...
     */
    @Schema(title = "监控类型", example = "TanCloud", accessMode = READ_WRITE)
    @Length(max = 100)
    private String app;

    /**
     * Monitored peer host: ipv4, ipv6, domain name
     * 监控的对端host:ipv4,ipv6,域名
     */
    @Schema(title = "监控的对端host", example = "192.167.25.11", accessMode = READ_WRITE)
    @Length(max = 100)
    @HostValid
    private String host;

    /**
     * Monitoring collection interval time, in seconds
     * 监控的采集间隔时间,单位秒
     */
    @Schema(title = "监控的采集间隔时间,单位秒", example = "600", accessMode = READ_WRITE)
    @Min(10)
    private Integer intervals;

    /**
     * Monitoring status 0: Unmonitored, 1: Available, 2: Unavailable
     * 任务状态 0:未监控,1:可用,2:不可用
     */
    @Schema(title = "任务状态 0:未监控,1:可用,2:不可用", accessMode = READ_WRITE)
    @Min(0)
    @Max(4)
    private byte status;

    /**
     * Monitoring note description
     * 监控备注描述
     */
    @Schema(title = "监控备注描述", example = "对SAAS网站TanCloud的可用性监控", accessMode = READ_WRITE)
    @Length(max = 255)
    private String description;

    /**
     * The creator of this record
     */
    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    /**
     * This record was last modified by
     */
    @Schema(title = "The modifier of this record", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    /**
     * Record create time
     */
    @Schema(title = "Record create time", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    /**
     * Record the latest modification time (timestamp in milliseconds)
     */
    @Schema(title = "Record modify time", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    /**
     * 多对多关联中，需设置第三张关联中间表JoinTable
     * JoinTable name 为关联关系中间表名称
     *           joinColumns：中间表的外键字段关联当前实体类所对应表的主键字段
     *           inverseJoinColumn：中间表的外键字段关联对方表的主键字段
     *           JoinColumn  name 中间表的关联字段名称
     *                       referencedColumnName 关联表的映射字段名称
     */
    @ManyToMany(targetEntity = Tag.class, cascade = CascadeType.MERGE, fetch = FetchType.EAGER)
    @JoinTable(name = "hzb_tag_monitor_bind",
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
        inverseForeignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
        joinColumns = {@JoinColumn(name = "monitor_id", referencedColumnName = "id")},
        inverseJoinColumns = {@JoinColumn(name = "tag_id", referencedColumnName = "id")})
    private List<Tag> tags;
}
