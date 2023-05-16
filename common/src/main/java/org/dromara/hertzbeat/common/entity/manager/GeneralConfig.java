package org.dromara.hertzbeat.common.entity.manager;

import com.vladmihalcea.hibernate.type.json.JsonStringType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;
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
 * 消息通知服务端配置实体
 * @author zqr10159
 */
@Entity
@Table(name = "hzb_config")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Message notification server config entity | 消息通知服务端配置实体")
@EntityListeners(AuditingEntityListener.class)
@TypeDef(name = "json", typeClass = JsonStringType.class)
public class GeneralConfig {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Schema(title = "GeneralConfig Primary Key Index ID",
			description = "通用配置主键索引ID",
			example = "87584674384", accessMode = READ_ONLY)
	private Long id;
	
	@Schema(title = "Config type: 1-SMS 2-Email, primary key ", description = "配置类型: 1-短信 2-邮件, 主键",
			accessMode = READ_WRITE)
	@Min(1)
	@NotNull
	private Byte type;
	
	@Type(type = "json")
	@Schema(title = "Config content", description = "配置内容，格式为json", accessMode = READ_WRITE)
	@Column(length = 4096)
	private String content;
	
	@Schema(title = "Whether to enable this policy",
			description = "是否启用此配置",
			example = "true", accessMode = READ_WRITE)
	private boolean enable = true;
	
	@Schema(title = "The creator of this record", description = "此条记录创建者", example = "tom", accessMode = READ_ONLY)
	@CreatedBy
	private String creator;
	
	@Schema(title = "This record was last modified by",
			description = "此条记录最新修改者",
			example = "tom", accessMode = READ_ONLY)
	@LastModifiedBy
	private String modifier;
	
	@Schema(title = "This record creation time (millisecond timestamp)",
			description = "记录创建时间", accessMode = READ_ONLY)
	@CreatedDate
	private LocalDateTime gmtCreate;
	
	@Schema(title = "Record the latest modification time (timestamp in milliseconds)",
			description = "记录最新修改时间", accessMode = READ_ONLY)
	@LastModifiedDate
	private LocalDateTime gmtUpdate;
}
