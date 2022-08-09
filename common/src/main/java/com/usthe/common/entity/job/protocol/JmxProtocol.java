package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Jmx protocol
 *
 * @author huacheng
 * @date 2022/6/21 15:45
 **/
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class JmxProtocol {
    /**
     * JMX host ip or domain name
     * JMX主机ip或域名
     */
    private String host;

    /**
     * The port number
     * 端口号
     */
    private String port;

    /**
     * 是否使用链路加密ssl/tls
     * enable ssl?
     */
    private String ssl = "false";

    /**
     * Jmx username (optional)
     * Jmx用户名(可选)
     */
    private String username;

    /**
     * Jmx password (optional)
     * Jmx密码(可选)
     */
    private String password;

    /**
     * jmx protocol custom collection indicator address
     * jmx协议自定义收集指标地址
     */
    private String url;

    /**
     * The name of the type where the outer layer of the jmx indicator is located
     * jmx指标外层所在类型名称
     */
    private String objectName;

}
