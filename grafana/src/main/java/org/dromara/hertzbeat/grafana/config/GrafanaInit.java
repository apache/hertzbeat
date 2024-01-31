package org.dromara.hertzbeat.grafana.config;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.grafana.ServiceAccount;
import org.dromara.hertzbeat.grafana.service.ServiceAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
@Component
@Slf4j
public class GrafanaInit {
    @Autowired
    private GrafanaConfiguration grafanaConfiguration;
    @Autowired
    private ServiceAccountService serviceAccountService;
    //1.判断配置是否填写完整
    //2.判断是否有账号，没有则创建且保证账号唯一
    //2.判断是否有token，没有则创建且保证账号唯一
    @PostConstruct
    public void init() {
        if (grafanaConfiguration.isEnabled() && grafanaConfiguration.getUrl() != null && grafanaConfiguration.getUsername() != null && grafanaConfiguration.getPassword() != null) {
            try {
                serviceAccountService.getAccount();
            } catch (RuntimeException e) {
                log.info("service account is not exist, create service account");
                serviceAccountService.createServiceAccount();
            }
            try {
                serviceAccountService.getToken();
            } catch (RuntimeException e) {
                log.info("service token is not exist, create service token");
                serviceAccountService.createToken();
            }
        }
    }
}
