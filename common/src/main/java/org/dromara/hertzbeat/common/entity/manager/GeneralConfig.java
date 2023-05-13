package org.dromara.hertzbeat.common.entity.manager;

import com.vladmihalcea.hibernate.type.json.JsonStringType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
/**
 * @description: 消息通知服务端配置实体
        * @author zqr10159
        * @date 2023/5/9 22:39
        * @version 1.0
        */
@Entity
@Table(name = "hzb_config", schema = "hertzbeat")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Message notification server config entity | 消息通知服务端配置实体")
@EntityListeners(AuditingEntityListener.class)
@TypeDef(name = "json", typeClass = JsonStringType.class)

public class GeneralConfig {
    @Id
    @Basic
    @Column(name = "type")
    @Schema(title = "Config type: 1-SMS 2-Email, primary key ",
            description = "配置类型: 1-短信 2-邮件, 主键",
            accessMode = READ_WRITE)
    @Min(1)
    @NotNull
    private Byte type;

    @Type(type = "json")
    @Column(name = "content", columnDefinition = "json")
    @Schema(title = "Config content",
            description = "配置内容，格式为json",
            accessMode = READ_WRITE)
    private String content;

    @Basic
    @Column(name = "enabled", columnDefinition = "TINYINT(1)")
    @Schema(title = "Flag, 0 for native configuration and 1 for database configuration.",
            description = "标志位，使用原生配置为0，使用数据库配置为1",
            accessMode = READ_WRITE)
    private boolean enabled;

}
