package com.usthe.manager.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Range;

import javax.validation.constraints.NotBlank;

import static io.swagger.annotations.ApiModelProperty.AccessMode.READ_ONLY;

/**
 * 登录注册账户信息传输体 username phone email
 * @author tomsun28
 * @date 20:36 2019-08-01
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "账户信息传输体")
public class LoginDto {

    @ApiModelProperty(value = "类型", example = "1", accessMode = READ_ONLY, position = 0)
    @Range(min = 0, max = 4, message = "1.账户(邮箱用户名手机号)密码登录 2.github登录 3.微信登录")
    private Byte type;

    @ApiModelProperty(value = "用户标识", example = "1", accessMode = READ_ONLY, position = 0)
    @NotBlank(message = "Identifier can not null")
    private String identifier;

    @ApiModelProperty(value = "密钥", example = "1", accessMode = READ_ONLY, position = 0)
    @NotBlank(message = "Credential can not null")
    private String credential;

}
