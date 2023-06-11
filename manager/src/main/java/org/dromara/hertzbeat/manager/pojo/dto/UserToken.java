package org.dromara.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import javax.validation.constraints.NotNull;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * @author:Li Jinming
 * @Description:
 * @date:2023-06-10
 */

@Entity
@Table(name = "hzb_user_token")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "User token | 用户token")
@EntityListeners(AuditingEntityListener.class)
public class UserToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "token主键索引ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "user identifier | user identifier", example = "", accessMode = READ_ONLY)
    @NotNull
    private String accountIdentifier;

    @Schema(title = "token | JWT token", example = "", accessMode = READ_WRITE)
    @NotNull
    @Column(columnDefinition = "varchar(512)")
    private String token;


}
