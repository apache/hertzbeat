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

package com.usthe.common.entity.manager;

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
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Notification strategy entity
 * 通知策略
 * @author tomsun28
 * @date 2021/11/13 22:19
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
    private List<TagItem> tags;

    @Schema(title = "The creator of this record", description = "此条记录创建者", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by",
            description = "此条记录最新修改者",
            example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "This record creation time (millisecond timestamp)",
            description = "记录创建时间(毫秒时间戳)",
            example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)",
            description = "记录最新修改时间(毫秒时间戳)",
            example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;


    @AllArgsConstructor
    @NoArgsConstructor
    @Data
    public static class TagItem {

        @Schema(title = "Tag Name")
        @NotBlank
        private String name;

        @Schema(title = "Tag Value")
        private String value;
    }
}
