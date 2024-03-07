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
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Notification template entity
 * 通知模版
 * @author eden4701
 */
@Entity
@Table(name = "hzb_notice_template")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Notify Policy Template | 通知模板实体")
@EntityListeners(AuditingEntityListener.class)
public class NoticeTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Notification Template Entity Primary Key Index ID",
            description = "通知模板实体主键索引ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Template name",
            description = "模板名称",
            example = "dispatch-1", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotBlank
    private String name;

    @Schema(title = "Notification information method: 0-SMS 1-Email 2-webhook 3-WeChat Official Account 4-Enterprise WeChat Robot " +
            "5-DingTalk Robot 6-FeiShu Robot 7-Telegram Bot 8-SlackWebHook 9-Discord Bot 10-Enterprise WeChat app message",
            description = "通知信息方式: 0-手机短信 1-邮箱 2-webhook 3-微信公众号 4-企业微信机器人 5-钉钉机器人 6-飞书机器人 7-Telegram机器人 8-SlackWebHook 9-Discord机器人 10-企业微信-应用消息",
            accessMode = READ_WRITE)
    @Min(0)
    @NotNull
    private Byte type;

    @Schema(title = "Is it a preset template: true- preset template false- custom template.",
            description = "是否为预设模板: true-预设模板 false-自定义模板",
            accessMode = READ_WRITE)
    @Column(columnDefinition = "boolean default false")
    private boolean preset = false;

    @Schema(title = "Template content",
            description = "模板内容",
            example = "[${title}]\n" +
                    "${targetLabel} : ${target}\n" +
                    "<#if (monitorId??)>${monitorIdLabel} : ${monitorId} </#if>\n" +
                    "<#if (monitorName??)>${monitorNameLabel} : ${monitorName} </#if>\n" +
                    "<#if (monitorHost??)>${monitorHostLabel} : ${monitorHost} </#if>\n" +
                    "${priorityLabel} : ${priority}\n" +
                    "${triggerTimeLabel} : ${triggerTime}\n" +
                    "${contentLabel} : ${content}", accessMode = READ_WRITE)
    @Length(max = 60000)
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
