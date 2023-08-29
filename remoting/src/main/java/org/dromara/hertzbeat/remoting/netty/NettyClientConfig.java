package org.dromara.hertzbeat.remoting.netty;

import lombok.Data;

/**
 * netty client config
 */
@Data
public class NettyClientConfig {

    private String serverIp;

    private int serverPort;

    private int connectTimeoutMillis = 10000;
}
