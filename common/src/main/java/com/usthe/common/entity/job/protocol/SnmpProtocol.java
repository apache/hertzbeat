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

    private String timeout;


    private  String oid;


    private String community;


}
