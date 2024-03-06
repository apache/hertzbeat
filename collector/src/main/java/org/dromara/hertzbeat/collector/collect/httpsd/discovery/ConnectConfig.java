package org.dromara.hertzbeat.collector.collect.httpsd.discovery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

/**
 * Discovery Client Connect Config
 * @author Calvin
 */
@Data
@Builder
@AllArgsConstructor
public class ConnectConfig {
    private String host;
    private int port;
}
