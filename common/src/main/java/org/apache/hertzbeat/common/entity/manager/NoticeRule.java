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

package org.apache.hertzbeat.common.entity.manager;

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
 */
@Entity
@Table(name = "hzb_notice_rule")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Notify Policy Entity")
@EntityListeners(AuditingEntityListener.class)
public class NoticeRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Notification Policy Entity Primary Key Index ID",
            description = "Notification Policy Entity Primary Key Index ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Policy name",
            description = "Policy name",
            example = "dispatch-1", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String name;

    @Schema(title = "Recipient ID",
            description = "Recipient ID",
            example = "4324324", accessMode = READ_WRITE)
    @NotNull
    @Convert(converter = JsonLongListAttributeConverter.class)
    private List<Long> receiverId;

    @Schema(title = "Recipient identification",
            description = "Recipient identification",
            example = "tom", accessMode = READ_WRITE)
    @Convert(converter = JsonStringListAttributeConverter.class)
    private List<String> receiverName;

    @Schema(title = "Template ID",
            description = "Template ID",
            example = "4324324", accessMode = READ_WRITE)
    private Long templateId;

    @Schema(title = "Template identification",
            description = "Template identification",
            example = "demo", accessMode = READ_WRITE)
    @Length(max = 100)
    private String templateName;

    @Schema(title = "Whether to enable this policy",
            description = "Whether to enable this policy",
            example = "true", accessMode = READ_WRITE)
    private boolean enable = true;

    @Schema(title = "Whether to forward all",
            description = "Whether to forward all",
            example = "false", accessMode = READ_WRITE)
    private boolean filterAll = true;

    @Schema(title = "Filter the matching alarm level, empty is all alarm level " +
            "0: high -emergency- Urgent alarm - red 1: Medium -critical- Serious alarm - orange 2: Low -warning- Warning alarm - yellow",
            example = "[1]", accessMode = READ_WRITE)
    @Convert(converter = JsonByteListAttributeConverter.class)
    private List<Byte> priorities;

    @Schema(description = "Alarm information label(monitorId:xxx,monitorName:xxx)", example = "{name: key1, value: value1}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonTagListAttributeConverter.class)
    @Column(length = 2048)
    private List<TagItem> tags;

    @Schema(title = "Day of the week, multiple, all or empty is daily 7: Sunday 1: Monday 2: Tuesday 3: Wednesday 4: Thursday 5: Friday 6: Saturday",
            example = "[0,1]", accessMode = READ_WRITE)
    @Convert(converter = JsonByteListAttributeConverter.class)
    private List<Byte> days;

    @Schema(title = "Limit time period start", example = "00:00:00", accessMode = READ_WRITE)
    private ZonedDateTime periodStart;

    @Schema(title = "Restricted time period end", example = "23:59:59", accessMode = READ_WRITE)
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
