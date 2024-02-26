package org.dromara.hertzbeat.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.*;


/**
 * 邮件账号配置dto
 *
 * @author zqr
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailNoticeSender {

    @NotNull(message = "类型不能为空|Type cannot be empty")
    private Integer type;

    @NotBlank(message = "邮件主机不能为空|Mail host cannot be empty")
    private String emailHost;

    @NotBlank(message = "用户名不能为空|Username cannot be empty")
    @Email
    private String emailUsername;

    @NotBlank(message = "密码不能为空|Password cannot be empty")
    private String emailPassword;

    @NotNull(message = "邮件端口不能为空|Mail port cannot be null")
    @Max(message = "邮件端口不得大于65535|Mail port must be less than or equal to 65535", value = 65535)
    @Min(message = "邮件端口不得小于1|Mail port must be greater than or equal to 1", value = 1)
    private Integer emailPort;

    private boolean emailSsl = true;

    private boolean enable = true;
}
