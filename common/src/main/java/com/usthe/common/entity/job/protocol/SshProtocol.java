package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ssh 协议参数配置
 * @author tom
 * @date 2022/3/11 15:20
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SshProtocol {

    /**
     * 对端主机ip或域名
     */
    private String host;

    /**
     * 对端主机端口
     */
    private String port;

    /**
     * 超时时间
     */
    private String timeout;

    /**
     * 用户名
     */
    private String username;

    /**
     * 密码(可选)
     */
    private String password;

    /**
     * 公钥(可选)
     */
    private String publicKey;

    /**
     * SSH执行脚本
     */
    private String script;

    /**
     * 响应数据解析方式：oneRow, multiRow
     */
    private String parseType;
}
