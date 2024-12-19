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
 * Message notification recipient entity
 */
@Entity
@Table(name = "hzb_notice_receiver")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Message notification recipient entity")
@EntityListeners(AuditingEntityListener.class)
public class NoticeReceiver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Recipient entity primary key index ID", description = "Recipient entity primary key index ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Recipient name", description = "Recipient name",
            example = "tom", accessMode = READ_WRITE)
    @Size(max = 100)
    @NotBlank(message = "name can not null")
    private String name;

    @Schema(title = "Notification information method: 0-SMS 1-Email 2-webhook 3-WeChat Official Account 4-Enterprise WeChat Robot "
            + "5-DingTalk Robot 6-FeiShu Robot 7-Telegram Bot 8-SlackWebHook 9-Discord Bot 10-Enterprise WeChat app message",
            description = "Notification information method: "
                    + "0-SMS 1-Email 2-webhook 3-WeChat Official Account "
                    + "4-Enterprise WeChat Robot 5-DingTalk Robot 6-FeiShu Robot "
                    + "7-Telegram Bot 8-SlackWebHook 9-Discord Bot 10-Enterprise "
                    + "WeChat app message",
            accessMode = READ_WRITE)
    @Min(0)
    @NotNull(message = "type can not null")
    private Byte type;

    @Schema(title = "Mobile number: Valid when the notification method is SMS",
            description = "Mobile number: Valid when the notification method is SMS",
            example = "18923435643", accessMode = READ_WRITE)
    @Size(max = 100)
    private String phone;

    @Schema(title = "Email account: Valid when the notification method is email",
            description = "Email account: Valid when the notification method is email",
            example = "tom@qq.com", accessMode = READ_WRITE)
    @Size(max = 100)
    private String email;

    @Schema(title = "URL address: The notification method is valid for webhook",
            description = "URL address: The notification method is valid for webhook",
            example = "https://www.tancloud.cn", accessMode = READ_WRITE)
    @Size(max = 300)
    @Column(length = 300)
    private String hookUrl;

    @Schema(title = "openId : The notification method is valid for WeChat official account, enterprise WeChat robot or FlyBook robot",
            description = "openId : The notification method is valid for WeChat official account, enterprise WeChat robot or FlyBook robot",
            example = "343432", accessMode = READ_WRITE)
    @Size(max = 300)
    @Column(length = 300)
    private String wechatId;

    @Schema(title = "Access token : The notification method is valid for DingTalk robot",
            description = "Access token : The notification method is valid for DingTalk robot",
            example = "34823984635647", accessMode = READ_WRITE)
    @Size(max = 300)
    @Column(length = 300)
    private String accessToken;

    @Schema(title = "Telegram bot token : The notification method is valid for Telegram Bot",
            description = "Telegram bot token : The notification method is valid for Telegram Bot",
            example = "1499012345:AAEOB_wEYS-DZyPM3h5NzI8voJMXXXXXX", accessMode = READ_WRITE)
    private String tgBotToken;

    @Schema(title = "Telegram user id: The notification method is valid for Telegram Bot",
            description = "Telegram user id: The notification method is valid for Telegram Bot",
            example = "779294123", accessMode = READ_WRITE)
    private String tgUserId;

    @Schema(title = "DingTalk,FeiShu,WeWork user id: The notification method is valid for DingTalk,FeiShu,WeWork Bot",
            description = "DingTalk,FeiShu,WeWork user id: The notification method is valid for DingTalk,FeiShu,WeWork Bot",
            example = "779294123", accessMode = READ_WRITE)
    private String userId;

    @Schema(title = "URL address: The notification method is valid for Slack",
            description = "URL address: The notification method is valid for Slack",
            example = "https://hooks.slack.com/services/XXXX/XXXX/XXXX", accessMode = READ_WRITE)
    @Size(max = 300)
    @Column(length = 300)
    private String slackWebHookUrl;

    @Schema(title = "Enterprise weChat message: The notification method is valid for Enterprise WeChat app message",
            description = "Enterprise weChat message: The notification method is valid for Enterprise WeChat app message",
            example = "ww1a603432123d0dc1", accessMode = READ_WRITE)
    private String corpId;

    @Schema(title = "Enterprise weChat appId: The notification method is valid for Enterprise WeChat app message",
            description = "Enterprise weChat appId: The notification method is valid for Enterprise WeChat app message",
            example = "1000001", accessMode = READ_WRITE)
    private Integer agentId;

    @Schema(title = "Enterprise weChat secret: The notification method is valid for Enterprise WeChat app message",
            description = "Enterprise weChat secret: The notification method is valid for Enterprise WeChat app message",
            example = "oUydwn92ey0lnuY02MixNa57eNK-20dJn5NEOG-u2uE", accessMode = READ_WRITE)
    private String appSecret;

    @Schema(title = "Enterprise weChat party id: The notification method is valid for Enterprise WeChat app message",
            description = "Enterprise weChat party id: The notification method is valid for Enterprise WeChat app message",
            example = "779294123", accessMode = READ_WRITE)
    private String partyId;

    @Schema(title = "Enterprise weChat tag id: The notification method is valid for Enterprise WeChat app message",
            description = "Enterprise weChat tag id: The notification method is valid for Enterprise WeChat app message",
            example = "779294123", accessMode = READ_WRITE)
    private String tagId;

    @Schema(title = "Discord channel id: The notification method is valid for Discord",
            description = "Discord channel id: The notification method is valid for Discord",
            example = "1065303416030642266", accessMode = READ_WRITE)
    @Size(max = 300)
    @Column(length = 300)
    private String discordChannelId;

    @Schema(title = "Discord bot token: The notification method is valid for Discord",
            description = "Discord bot token: The notification method is valid for Discord",
            example = "MTA2NTMwMzU0ODY4Mzg4MjUzNw.xxxxx.xxxxxxx", accessMode = READ_WRITE)
    @Size(max = 300)
    @Column(length = 300)
    private String discordBotToken;

    @Schema(title = "huawei cloud SMN ak: If the notification method is valid for huawei cloud SMN",
            description = "huawei cloud SMN ak: If the notification method is valid for huawei cloud SMN",
            example = "NCVBODJOEYHSW3VNXXXX", accessMode = READ_WRITE)
    @Size(max = 22)
    @Column(length = 22)
    private String smnAk;

    @Schema(title = "huawei cloud SMN sk: If the notification method is valid for huawei cloud SMN",
            description = "huawei cloud SMN sk: If the notification method is valid for huawei cloud SMN",
            example = "nmSNhUJN9MlpPl8lfCsgdA0KvHCL9JXXXX", accessMode = READ_WRITE)
    @Size(max = 42)
    @Column(length = 42)
    private String smnSk;

    @Schema(title = "huawei cloud SMN projectId: If the notification method is valid for huawei cloud SMN",
            description = "huawei cloud SMN projectId: If the notification method is valid for huawei cloud SMN",
            example = "320c2fb11edb47a481c299c1XXXXXX", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(length = 32)
    private String smnProjectId;

    @Schema(title = "huawei cloud SMN region: If the notification method is valid for huawei cloud SMN",
            description = "huawei cloud SMN region: If the notification method is valid for huawei cloud SMN",
            example = "cn-east-3", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(length = 32)
    private String smnRegion;

    @Schema(title = "huawei cloud SMN TopicUrn: If the notification method is valid for huawei cloud SMN",
            description = "huawei cloud SMN TopicUrn: If the notification method is valid for huawei cloud SMN",
            example = "urn:smn:cn-east-3:xxx:hertzbeat_test", accessMode = READ_WRITE)
    @Size(max = 300)
    @Column(length = 300)
    private String smnTopicUrn;

    @Schema(title = "serverChanToken : The notification method is valid for ServerChan",
            description = "serverChanToken : The notification method is valid for ServerChan",
            example = "SCT193569TSNm6xIabdjqeZPtOGOWcvU1e", accessMode = READ_WRITE)
    @Size(max = 300)
    @Column(length = 300)
    private String serverChanToken;

    @Schema(title = "Gotify token : The notification method is valid for Gotify",
            description = "Gotify token : The notification method is valid for Gotify",
            example = "A845h__ZMqDxZlO", accessMode = READ_WRITE)
    @Size(max = 300)
    @Column(length = 300)
    private String gotifyToken;

    @Schema(title = "The creator of this record", example = "tom",
            accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record creation time (millisecond timestamp)",
            example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)",
            example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

}
