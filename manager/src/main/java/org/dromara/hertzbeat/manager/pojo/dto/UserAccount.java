package org.dromara.hertzbeat.manager.pojo.dto;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.usthe.sureness.provider.SurenessAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import org.dromara.hertzbeat.common.entity.manager.*;
import org.hibernate.validator.constraints.Length;
import org.hibernate.validator.constraints.Range;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;

import java.util.ArrayList;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * @author:Li Jinming
 * @Description: 用户信息实体类
 * @date:2023-06-07
 */

@Entity
@Table(name = "hzb_user_info", indexes = {
        @Index(name = "user_query_index", columnList = "identifier"),
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "user account | 用户账户")
@EntityListeners(AuditingEntityListener.class)
public class UserAccount implements SurenessAccount {
    /**
     * user ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "userID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    /**
     * type
     * 1. Account (email username and mobile phone number) password login 2. github login 3. WeChat login
     */
    @Schema(description = "类型", example = "1", accessMode = READ_WRITE)
    @Range(min = 0, max = 4, message = "1.账户(邮箱用户名手机号)密码登录 2.github登录 3.微信登录")
    private Byte type;

    /**
     * User Name
     */
    @Schema(description = "用户标识", example = "1", accessMode = READ_WRITE)
    @NotBlank(message = "Identifier can not null")
    private String identifier;

    /**
     * key
     */
    @Schema(description = "密码", example = "1", accessMode = READ_WRITE)
    @NotBlank(message = "password can not null")
    @Length(max = 512, message = "password max length 512")
    private String password;


    /**
     * account name
     */
    @Schema(description = "账户名称", example = "zhangsan", accessMode = READ_WRITE)
    @Length(max = 512, message = "accountName max length 512")
    private String accountName;

    /**
     * salt
     */
    @Schema(description = "加密盐值", example = "salt", accessMode = READ_ONLY)
    @Length(max = 512, message = "salt max length 512")
    private String salt;

    /**
     * user role (rbac)
     */
    @Schema(title = "用户角色权限", example = "admin", accessMode = READ_WRITE)
    @NonNull
    @Convert(converter = JsonStringListAttributeConverter.class)
    List<String> ownRoles;


    /**
     *
     */
    @Schema(title = "是否锁定", example = "ture", accessMode = READ_WRITE)
    @NonNull
    private boolean disabledAccount;

    /**
     *
     */
    @Schema(title = "是否过期", example = "ture", accessMode = READ_WRITE)
    @NonNull
    private boolean excessiveAttempts;

    @Override
    public String getAppId() {
        return this.identifier;
    }

}
