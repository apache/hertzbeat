package com.usthe.common.entity.manager;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;
import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_WRITE;

/**
 * Message notification recipient entity
 * 消息通知接收人实体
 *
 * @author tomsun28
 * @date 2021/11/13 22:19
 */
@Entity
@Table(name = "notice_receiver")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "en: Message notification recipient entity,zh:消息通知接收人实体")
public class NoticeReceiver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ApiModelProperty(value = "Recipient entity primary key index ID",
            notes = "接收人实体主键索引ID",
            example = "87584674384", accessMode = READ_ONLY, position = 0)
    private Long id;

    @ApiModelProperty(value = "Recipient name",
            notes = "接收人名称",
            example = "tom", accessMode = READ_WRITE, position = 1)
    @Length(max = 100)
    @NotNull
    private String name;

    @ApiModelProperty(value = "Notification information method: 0-SMS 1-Email 2-webhook 3-WeChat Official Account 4-Enterprise WeChat Robot 5-DingTalk Robot 6-FeiShu Robot",
            notes = "通知信息方式: 0-手机短信 1-邮箱 2-webhook 3-微信公众号 4-企业微信机器人 5-钉钉机器人 6-飞书机器人",
            accessMode = READ_WRITE, position = 2)
    @Min(0)
    @Max(8)
    @NotNull
    private Byte type;

    @ApiModelProperty(value = "Mobile number: Valid when the notification method is SMS",
            notes = "手机号 :  通知方式为手机短信时有效",
            example = "18923435643", accessMode = READ_WRITE, position = 3)
    @Length(max = 100)
    private String phone;

    @ApiModelProperty(value = "Email account: Valid when the notification method is email",
            notes = "邮箱账号 : 通知方式为邮箱时有效",
            example = "tom@qq.com", accessMode = READ_WRITE, position = 4)
    @Length(max = 100)
    private String email;

    @ApiModelProperty(value = "URL address: The notification method is valid for webhook",
            notes = "URL地址 : 通知方式为webhook有效",
            example = "https://www.tancloud.cn", accessMode = READ_WRITE, position = 5)
    @Length(max = 300)
    private String hookUrl;

    @ApiModelProperty(value = "openId : The notification method is valid for WeChat official account or enterprise WeChat robot",
            notes = "openId : 通知方式为微信公众号或企业微信机器人有效",
            example = "343432", accessMode = READ_WRITE, position = 6)
    @Length(max = 300)
    private String wechatId;

    @ApiModelProperty(value = "Access token : The notification method is valid for DingTalk robot",
            notes = "访问token : 通知方式为钉钉机器人有效",
            example = "34823984635647", accessMode = READ_WRITE, position = 7)
    @Length(max = 300)
    private String accessToken;

    @ApiModelProperty(value = "The creator of this record",
            notes = "此条记录创建者",
            example = "tom", accessMode = READ_ONLY, position = 7)
    private String creator;

    @ApiModelProperty(value = "This record was last modified by",
            notes = "此条记录最新修改者",
            example = "tom", accessMode = READ_ONLY, position = 8)
    private String modifier;

    @ApiModelProperty(value = "Record creation time (millisecond timestamp)",
            notes = "记录创建时间(毫秒时间戳)",
            example = "1612198922000", accessMode = READ_ONLY, position = 9)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtCreate;

    @ApiModelProperty(value = "Record the latest modification time (timestamp in milliseconds)",
            notes = "记录最新修改时间(毫秒时间戳)",
            example = "1612198444000", accessMode = READ_ONLY, position = 10)
    @Column(insertable = false, updatable = false)
    private LocalDateTime gmtUpdate;

}
