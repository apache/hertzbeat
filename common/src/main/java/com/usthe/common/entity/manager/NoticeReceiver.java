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
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;


/**
 * Message notification recipient entity
 * 消息通知接收人实体
 *
 * @author tomsun28
 * @date 2021/11/13 22:19
 */
@Entity
@Table(name = "hzb_notice_receiver")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Message notification recipient entity | 消息通知接收人实体")
@EntityListeners(AuditingEntityListener.class)
public class NoticeReceiver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Recipient entity primary key index ID", description = "接收人实体主键索引ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Recipient name", description = "接收人名称",
            example = "tom", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String name;

    @Schema(title = "Notification information method: 0-SMS 1-Email 2-webhook 3-WeChat Official Account 4-Enterprise WeChat Robot 5-DingTalk Robot 6-FeiShu Robot 7-Telegram Bot 8-SlackWebHook 9-Discord Bot",
            description = "通知信息方式: 0-手机短信 1-邮箱 2-webhook 3-微信公众号 4-企业微信机器人 5-钉钉机器人 6-飞书机器人 7-Telegram机器人 8-SlackWebHook 9-Discord机器人",
            accessMode = READ_WRITE)
    @Min(0)
    @NotNull
    private Byte type;

    @Schema(title = "Mobile number: Valid when the notification method is SMS",
            description = "手机号 :  通知方式为手机短信时有效",
            example = "18923435643", accessMode = READ_WRITE)
    @Length(max = 100)
    private String phone;

    @Schema(title = "Email account: Valid when the notification method is email",
            description = "邮箱账号 : 通知方式为邮箱时有效",
            example = "tom@qq.com", accessMode = READ_WRITE)
    @Length(max = 100)
    private String email;

    @Schema(title = "URL address: The notification method is valid for webhook",
            description = "URL地址 : 通知方式为webhook有效",
            example = "https://www.tancloud.cn", accessMode = READ_WRITE)
    @Length(max = 300)
    private String hookUrl;

    @Schema(title = "openId : The notification method is valid for WeChat official account, enterprise WeChat robot or FlyBook robot",
            description = "openId : 通知方式为微信公众号，企业微信机器人或飞书机器人有效",
            example = "343432", accessMode = READ_WRITE)
    @Length(max = 300)
    private String wechatId;

    @Schema(title = "Access token : The notification method is valid for DingTalk robot",
            description = "访问token : 通知方式为钉钉机器人有效",
            example = "34823984635647", accessMode = READ_WRITE)
    @Length(max = 300)
    private String accessToken;

    @Schema(title = "Telegram bot token : The notification method is valid for Telegram Bot",
            description = "Telegram bot token : 通知方式为Telegram机器人有效",
            example = "1499012345:AAEOB_wEYS-DZyPM3h5NzI8voJMXXXXXX", accessMode = READ_WRITE)
    private String tgBotToken;

    @Schema(title = "Telegram user id: The notification method is valid for Telegram Bot",
            description = "Telegram user id : 通知方式为Telegram机器人有效",
            example = "779294123", accessMode = READ_WRITE)
    private String tgUserId;

    @Schema(title = "URL address: The notification method is valid for Slack",
            description = "URL地址 : 通知方式为Slack有效",
            example = "https://hooks.slack.com/services/XXXX/XXXX/XXXX", accessMode = READ_WRITE)
    @Length(max = 300)
    private String slackWebHookUrl;

    @Schema(title = "Discord channel id: The notification method is valid for Discord",
            description = "Discord 频道id: 通知方式为Discord有效",
            example = "1065303416030642266", accessMode = READ_WRITE)
    @Length(max = 300)
    private String discordChannelId;

    @Schema(title = "Discord bot token: The notification method is valid for Discord",
            description = "Discord 机器人Token: 通知方式为Discord有效",
            example = "MTA2NTMwMzU0ODY4Mzg4MjUzNw.xxxxx.xxxxxxx", accessMode = READ_WRITE)
    @Length(max = 300)
    private String discordBotToken;

    @Schema(title = "The creator of this record", description = "此条记录创建者", example = "tom",
            accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by", description = "此条记录最新修改者",
            example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record creation time (millisecond timestamp)", description = "记录创建时间(毫秒时间戳)",
            example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)",
            description = "记录最新修改时间(毫秒时间戳)", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

}
