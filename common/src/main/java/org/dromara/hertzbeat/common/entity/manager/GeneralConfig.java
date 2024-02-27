package org.dromara.hertzbeat.common.entity.manager;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import javax.validation.constraints.NotNull;

import java.time.LocalDateTime;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Common Config Entity
 *
 * @author zqr10159
 */
@Entity
@Table(name = "hzb_config")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Common server config entity | 公共服务端配置实体")
@EntityListeners(AuditingEntityListener.class)
public class GeneralConfig {

    @Id
    @Schema(title = "Config type: email sms, primary key ", description = "配置类型: email sms, 主键",
            accessMode = READ_WRITE)
    @NotNull
    private String type;

    @Schema(title = "Config content", description = "配置内容，格式为json", accessMode = READ_WRITE)
    @Column(length = 8192)
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
