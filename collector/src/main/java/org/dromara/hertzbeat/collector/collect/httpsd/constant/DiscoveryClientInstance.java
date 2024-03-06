package org.dromara.hertzbeat.collector.collect.httpsd.constant;

import org.apache.commons.lang3.StringUtils;

import java.util.Arrays;

/**
 * Discovery Client Instance Name For Httpsd monitor
 * @author Calvin
 */
public enum DiscoveryClientInstance {
    CONSUL("Consul"),
    NACOS("Nacos"),
    NOT_SUPPORT("Not support discovery client instance! "),
    ;

    private final String name;

    DiscoveryClientInstance(String name) {
        this.name = name;
    }

    public static DiscoveryClientInstance getByName(String clientInstanceName) {
        return Arrays.stream(DiscoveryClientInstance.values())
                .filter(instance -> StringUtils.equalsIgnoreCase(instance.name, clientInstanceName))
                .findFirst()
                .orElse(DiscoveryClientInstance.NOT_SUPPORT);
    }
}
