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

package org.dromara.hertzbeat.common.entity.alerter;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dromara.hertzbeat.common.entity.manager.JsonByteListAttributeConverter;
import org.dromara.hertzbeat.common.entity.manager.JsonTagListAttributeConverter;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.hibernate.validator.constraints.Length;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Alert Silence strategy entity
 * @author tomsun28
 */
@Entity
@Table(name = "hzb_alert_silence")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alert Silence Policy Entity | 告警静默策略实体")
@EntityListeners(AuditingEntityListener.class)
public class AlertSilence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Alert Silence Policy Entity Primary Key Index ID",
            description = "告警静默策略实体主键索引ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Policy name",
            description = "策略名称",
            example = "silence-1", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String name;

    @Schema(title = "Whether to enable this policy",
            description = "是否启用此策略",
            example = "true", accessMode = READ_WRITE)
    private boolean enable = true;
    
    @Schema(title = "Whether to match all",
            description = "是否应用匹配所有",
            example = "true", accessMode = READ_WRITE)
    private boolean matchAll = true;

    @Schema(title = "Silence type 0: once, 1:cyc",
            description = "静默类型 0:一次性静默 1:周期性静默", accessMode = READ_WRITE)
    @NotNull
    private Byte type;

    @Schema(title = "Silenced alerts num",
            description = "已静默告警次数", accessMode = READ_WRITE)
    private Integer times;

    @Schema(title = "Alarm Level 0:High-Emergency-Critical Alarm 1:Medium-Critical-Critical Alarm 2:Low-Warning-Warning",
            example = "[1]", accessMode = READ_WRITE)
    @Convert(converter = JsonByteListAttributeConverter.class)
    private List<Byte> priorities;

    @Schema(description = "匹配告警信息标签(monitorId:xxx,monitorName:xxx)", example = "{name: key1, value: value1}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonTagListAttributeConverter.class)
    @Column(length = 2048)
    private List<TagItem> tags;

    @Schema(title = "周期性静默时有效 星期几,多选,全选或空则为每天 7:周日 1:周一 2:周二 3:周三 4:周四 5:周五 6:周六", example = "[0,1]", accessMode = READ_WRITE)
    @Convert(converter = JsonByteListAttributeConverter.class)
    private List<Byte> days;

    @Schema(title = "限制时间段起始", example = "00:00:00", accessMode = READ_WRITE)
    private ZonedDateTime periodStart;

    @Schema(title = "限制时间段截止", example = "23:59:59", accessMode = READ_WRITE)
    private ZonedDateTime periodEnd;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "This record creation time (millisecond timestamp)", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
