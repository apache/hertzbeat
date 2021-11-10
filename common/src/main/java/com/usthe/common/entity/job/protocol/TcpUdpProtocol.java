package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 使用socket实现的tcp或ucp进行服务端口可用性探测
 * @author tomsun28
 * @date 2021/10/31 17:27
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TcpUdpProtocol {
    /**
     * 具体协议类型 tcp, udp
     */
    private String protocol;
    /**
     * 对端主机ip或域名
     */
    private String host;
    /**
     * 端口号
     */
    private Integer port;
}
