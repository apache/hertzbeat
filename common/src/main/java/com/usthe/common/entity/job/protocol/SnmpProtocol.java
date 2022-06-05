package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * snmp 协议配置
 * @author wangtao
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SnmpProtocol {
    /**
     * 对端主机ip或域名
     */
    private String host;
    /**
     * 对端主机端口
     */
    private String port;

    /**
     * 版本号
     */
    private String snmpVersion;

    private  String oid;

    /**
     * 超时时间
     */
    private String timeout;

    /**
     * snmp version v1 v2c v3
     * 0 = v1
     * 1 = v2c
     * 3 = v3
     */
    private Integer version = 1;

    /**
     * community name for v1 v2
     * 团体字 v1 v2 版本需要
     */
    private String community;

    /**
     * username (optional)
     */
    private String username;

    /**
     * auth password (optional)
     */
    private String authPassphrase;

    /**
     * password(optional)
     */
    private String privPassphrase;

    /**
     * oid map
     */
    private Map<String, String> oids;
}
