package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ftp protocol
 * @author 落阳
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FtpProtocol {
    /**
     * 对端主机ip或域名
     */
    private String host;

    /**
     * 端口号
     */
    private String port;

    /**
     * Redis用户名(可选)
     */
    private String username;

    /**
     * Redis密码(可选)
     */
    private String password;

    /**
     * 文件目录
     */
    private String direction;

    /**
     * 超时
     */
    private String timeout;
}
