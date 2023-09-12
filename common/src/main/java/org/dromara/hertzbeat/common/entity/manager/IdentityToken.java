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

/**
 * identity token entity
 * @author tom
 */
@Entity
@Table(name = "hzb_identity_token")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "issue identity token entity | 签发的身份令牌")
@EntityListeners(AuditingEntityListener.class)
public class IdentityToken {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "primary id", example = "2")
    private Long id;

	@Schema(title = "issued note message")
	@NotNull	
	private String note;
    
	@Schema(title = "issued token")
	@NotNull
	private String token;
    
    @Schema(title = "issued jwt")
    @NotNull
	@Column(length = 1024)
    private String jwt;
    
    @Schema(title = "issue identity time")
    private Long issueTime;

	@Schema(title = "identity expire time")
	private Long expireTime;
	
	@Schema(title = "The creator of this record", description = "此条记录创建者", example = "tom")
	@CreatedBy
	private String creator;
	
	@Schema(title = "This record was last modified by", description = "此条记录最新修改者")
	@LastModifiedBy
	private String modifier;
	
	@Schema(title = "This record creation time (millisecond timestamp)", description = "记录创建时间")
	@CreatedDate
	private LocalDateTime gmtCreate;
	
	@Schema(title = "Record the latest modification time (timestamp in milliseconds)", description = "记录最新修改时间")
	@LastModifiedDate
	private LocalDateTime gmtUpdate;
}
