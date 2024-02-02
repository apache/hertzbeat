package org.dromara.hertzbeat.grafana.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.grafana.ServiceToken;
import org.dromara.hertzbeat.grafana.dao.ServiceAccountDao;
import org.dromara.hertzbeat.grafana.dao.ServiceTokenDao;
import org.dromara.hertzbeat.grafana.service.ServiceAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
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
