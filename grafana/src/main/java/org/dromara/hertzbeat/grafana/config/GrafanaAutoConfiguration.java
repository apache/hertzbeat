package org.dromara.hertzbeat.grafana.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;

/**
 * Grafana auto configuration.
 * @author zqr10159
 */
@ComponentScan(basePackages = "org.dromara.hertzbeat.grafana")
@EnableConfigurationProperties(GrafanaConfiguration.class)
public class GrafanaAutoConfiguration {
}
