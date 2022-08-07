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

package com.usthe.common.entity.alerter;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
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

import javax.persistence.*;
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
@Table(name = "hzb_alert_define")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "Alert Define | 告警定义实体")
@EntityListeners(AuditingEntityListener.class)
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
    private Integer times;

    @ApiModelProperty(value = "告警阈值开关", example = "true", accessMode = READ_WRITE, position = 8)
    private boolean enable = true;

    @ApiModelProperty(value = "告警通知内容模版", example = "linux {monitor_name}: {monitor_id} cpu usage high",
            accessMode = READ_WRITE, position = 10)
    @Length(max = 1024)
    private String template;

    @ApiModelProperty(value = "此条记录创建者", example = "tom", accessMode = READ_ONLY, position = 11)
    @CreatedBy
    private String creator;

    @ApiModelProperty(value = "此条记录最新修改者", example = "tom", accessMode = READ_ONLY, position = 12)
    @LastModifiedBy
    private String modifier;

    @ApiModelProperty(value = "记录创建时间(毫秒时间戳)", example = "1612198922000", accessMode = READ_ONLY, position = 13)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @ApiModelProperty(value = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY, position = 14)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

}
