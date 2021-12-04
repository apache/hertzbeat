package com.usthe.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * telnet协议配置
 * @author tomsun28
 * @date 2021/10/31 16:41
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TelnetProtocol {

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

}
