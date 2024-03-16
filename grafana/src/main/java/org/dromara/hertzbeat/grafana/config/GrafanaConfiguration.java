package org.dromara.hertzbeat.grafana.config;

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * grafana configuration
 */
@Slf4j
@Setter
@Getter
@Configuration
@ConfigurationProperties(prefix = "grafana")
public class GrafanaConfiguration {
    /**
     * grafana is enabled
     */
    private boolean enabled;
    /**
     * grafana url
     */
    private String url;
    /**
     * grafana username
     */
    private String username;
    /**
     * grafana password
     */
    private String password;
}
