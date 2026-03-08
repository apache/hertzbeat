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

package org.apache.hertzbeat.common.entity.alerter;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Notification template entity
 */
@Entity
@Table(name = "hzb_notice_template")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Notify Policy Template")
@EntityListeners(AuditingEntityListener.class)
public class NoticeTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Notification Template Entity Primary Key Index ID",
            description = "Notification Template Entity Primary Key Index ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Template name",
            description = "Template name",
            example = "dispatch-1", accessMode = READ_WRITE)
    @Size(max = 100)
    @NotBlank
    private String name;

    @Schema(title = "Notification information method: 0-SMS 1-Email 2-webhook 3-WeChat Official Account 4-Enterprise WeChat Robot "
            + "5-DingTalk Robot 6-FeiShu Robot 7-Telegram Bot 8-SlackWebHook 9-Discord Bot 10-Enterprise WeChat app message",
            description = "Notification information method: "
                    + "0-SMS 1-Email 2-webhook 3-WeChat Official Account "
                    + "4-Enterprise WeChat Robot 5-DingTalk Robot 6-FeiShu Robot "
                    + "7-Telegram Bot 8-SlackWebHook 9-Discord Bot 10-Enterprise WeChat app message",
            accessMode = READ_WRITE)
    @Min(0)
    @NotNull
    private Byte type;

    @Schema(title = "Is it a preset template: true- preset template false- custom template.",
            description = "Is it a preset template: true- preset template false- custom template.",
            accessMode = READ_WRITE)
    @Column(columnDefinition = "boolean default false")
    private boolean preset = false;

    @Schema(title = "Template content",
            description = "Template content",
            example = """
                    [${title}]
                    ${targetLabel} : ${target}
                    <#if (monitorId??)>${monitorIdLabel} : ${monitorId} </#if>
                    <#if (monitorName??)>${monitorNameLabel} : ${monitorName} </#if>
                    <#if (monitorHost??)>${monitorHostLabel} : ${monitorHost} </#if>
                    ${priorityLabel} : ${priority}
                    ${triggerTimeLabel} : ${triggerTime}
                    ${contentLabel} : ${content}""", accessMode = READ_WRITE)
    @Size(max = 60000)
    @Lob
    @NotBlank
    private String content;

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
