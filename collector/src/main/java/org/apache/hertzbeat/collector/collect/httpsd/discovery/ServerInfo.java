package org.apache.hertzbeat.collector.collect.httpsd.discovery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Server Info
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServerInfo {
    private String address;
    private String port;
}
