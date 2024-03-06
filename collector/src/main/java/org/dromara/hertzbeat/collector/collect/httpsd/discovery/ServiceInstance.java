package org.dromara.hertzbeat.collector.collect.httpsd.discovery;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

/**
 * @author Calvin
 */
@Data
@Builder
@AllArgsConstructor
public class ServiceInstance {
    private String serviceId;
    private String serviceName;
    private String address;
    private String port;
    private String healthStatus;
}
