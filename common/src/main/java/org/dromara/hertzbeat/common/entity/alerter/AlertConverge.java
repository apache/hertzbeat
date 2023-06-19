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

import javax.persistence.*;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Alert Converge strategy entity
 * 告警收敛策略
 * @author tomsun28
 *
 */
@Entity
@Table(name = "hzb_alert_converge")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alert Converge Policy Entity | 告警收敛策略实体")
@EntityListeners(AuditingEntityListener.class)
public class AlertConverge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Alert Converge Policy Entity Primary Key Index ID",
            description = "告警收敛策略实体主键索引ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Policy name", description = "策略名称",
            example = "converge-1", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String name;

    @Schema(title = "Whether to enable this policy", description = "是否启用此策略",
            example = "true", accessMode = READ_WRITE)
    private boolean enable = true;
    
    @Schema(title = "Whether to match all", description = "是否应用匹配所有",
            example = "true", accessMode = READ_WRITE)
    private boolean matchAll = true;

    @Schema(title = "匹配告警级别，空为全部告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色",
            example = "[1]", accessMode = READ_WRITE)
    @Convert(converter = JsonByteListAttributeConverter.class)
    private List<Byte> priorities;

    @Schema(description = "匹配告警信息标签(monitorId:xxx,monitorName:xxx)", example = "{name: key1, value: value1}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonTagListAttributeConverter.class)
    @Column(length = 2048)
    private List<TagItem> tags;
    
    @Schema(title = "Repeat Alert Converge Time Range, unit s", example = "600", accessMode = READ_WRITE)
    @Min(0)
    private Integer evalInterval;

    @Schema(title = "The creator of this record", description = "此条记录创建者", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by",
            description = "此条记录最新修改者",
            example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "This record creation time (millisecond timestamp)",
            description = "记录创建时间", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)",
            description = "记录最新修改时间", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
