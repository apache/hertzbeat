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

import com.usthe.common.util.GsonUtil;
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

import javax.persistence.*;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;

import java.time.LocalDateTime;
import java.util.Map;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Alarm record entity 告警记录实体
 *
 * @author tom
 * @date 2021/12/9 15:37
 */
@Entity
@Table(name = "hzb_alert")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alarm record entity | 告警记录实体")
@EntityListeners(AuditingEntityListener.class)
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Alarm record entity primary key index ID",
            description = "告警记录实体主键索引ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Alert target object: monitor availability-available metrics-app.metrics.field",
            description = "告警目标对象: 监控可用性-available 指标-app.metrics.field",
            example = "1", accessMode = READ_WRITE)
    @Length(max = 255)
    private String target;

    @Schema(title = "Alarm definition ID associated with the alarm",
            description = "告警关联的告警定义ID",
            example = "8743267443543", accessMode = READ_WRITE)
    private Long alertDefineId;

    @Schema(title = "Alarm level 0: high-emergency-critical alarm-red 1: medium-critical-critical alarm-orange 2: low-warning-warning alarm-yellow",
            description = "告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色",
            example = "1", accessMode = READ_WRITE)
    @Min(0)
    @Max(2)
    private byte priority;

    @Schema(title = "The actual content of the alarm notification",
            description = "告警通知实际内容",
            example = "linux_192.134.32.1: 534543534 cpu usage high",
            accessMode = READ_WRITE)
    @Length(max = 2048)
    private String content;

    @Schema(title = "Alarm status: 0-normal alarm (to be processed) 1-threshold triggered but not reached the number of alarms 2-recovered alarm 3-processed",
            description = "告警状态: 0-正常告警(待处理) 1-阈值触发但未达到告警次数 2-恢复告警 3-已处理",
            example = "1", accessMode = READ_WRITE)
    @Min(0)
    @Max(3)
    private byte status;

    @Schema(title = "Alarm threshold trigger times",
            description = "告警阈值触发次数",
            example = "3", accessMode = READ_WRITE)
    @Min(0)
    private Integer times;

    @Schema(title = "Alarm trigger time (timestamp in milliseconds)",
            description = "首次告警触发时间(毫秒时间戳)",
            example = "1612198922000", accessMode = READ_ONLY)
    private Long firstTriggerTime;

    @Schema(title = "Alarm trigger time (timestamp in milliseconds)",
            description = "最近告警触发时间(毫秒时间戳)",
            example = "1612198922000", accessMode = READ_ONLY)
    private Long lastTriggerTime;

    @Schema(title = "Alarm evaluation interval (milliseconds)",
            description = "告警评估时间间隔(单位毫秒)",
            example = "2000", accessMode = READ_ONLY)
    private Long nextEvalInterval;

    @Schema(description = "告警信息标签(monitorId:xxx,monitorName:xxx)", example = "{key1:value1}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @SuppressWarnings("JpaAttributeTypeInspection")
    private Map<String, String> tags;

    @Schema(title = "此条记录创建者", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "此条记录最新修改者", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record the latest creation time (timestamp in milliseconds)",
            description = "记录最新创建时间(毫秒时间戳)",
            example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    @Override
    public Alert clone() {
        // deep clone
        return GsonUtil.fromJson(GsonUtil.toJson(this), Alert.class);
    }
}
