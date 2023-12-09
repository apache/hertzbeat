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
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Notification strategy entity
 * 通知策略
 * @author tomsun28
 */
@Entity
@Table(name = "hzb_notice_rule")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Notify Policy Entity | 通知策略实体")
@EntityListeners(AuditingEntityListener.class)
public class NoticeRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Notification Policy Entity Primary Key Index ID",
            description = "通知策略实体主键索引ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Policy name",
            description = "策略名称",
            example = "dispatch-1", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String name;

    @Schema(title = "Recipient ID",
            description = "接收人ID",
            example = "4324324", accessMode = READ_WRITE)
    @NotNull
    private Long receiverId;

    @Schema(title = "Recipient identification",
            description = "接收人标识",
            example = "tom", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String receiverName;

    @Schema(title = "Template ID",
            description = "模板ID",
            example = "4324324", accessMode = READ_WRITE)
    private Long templateId;

    @Schema(title = "Template identification",
            description = "通知模板标识",
            example = "demo", accessMode = READ_WRITE)
    @Length(max = 100)
    private String templateName;

    @Schema(title = "Whether to enable this policy",
            description = "是否启用此策略",
            example = "true", accessMode = READ_WRITE)
    private boolean enable = true;

    @Schema(title = "Whether to forward all",
            description = "是否转发所有",
            example = "false", accessMode = READ_WRITE)
    private boolean filterAll = true;

    @Schema(title = "过滤匹配告警级别，空为全部告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色",
            example = "[1]", accessMode = READ_WRITE)
    @Convert(converter = JsonByteListAttributeConverter.class)
    private List<Byte> priorities;

    @Schema(description = "告警信息标签(monitorId:xxx,monitorName:xxx)", example = "{name: key1, value: value1}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonTagListAttributeConverter.class)
    @Column(length = 2048)
    private List<TagItem> tags;

    @Schema(title = "星期几,多选,全选或空则为每天 7:周日 1:周一 2:周二 3:周三 4:周四 5:周五 6:周六", example = "[0,1]", accessMode = READ_WRITE)
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
