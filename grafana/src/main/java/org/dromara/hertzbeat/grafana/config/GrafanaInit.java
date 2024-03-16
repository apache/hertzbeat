package org.dromara.hertzbeat.grafana.config;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.grafana.service.DatasourceService;
import org.dromara.hertzbeat.grafana.service.ServiceAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * grafana init
 */
@Component
@Slf4j
public class GrafanaInit implements CommandLineRunner {
    @Autowired
    private GrafanaConfiguration grafanaConfiguration;
    @Autowired
    private ServiceAccountService serviceAccountService;
    @Autowired
    private DatasourceService datasourceService;

    //1.判断配置是否填写完整
    //2.判断是否有账号，没有则创建且保证账号唯一
    //2.判断是否有token，没有则创建且保证账号唯一
    @Override
    public void run(String... args) throws Exception {
        if (grafanaConfiguration.isEnabled() && grafanaConfiguration.getUrl() != null && grafanaConfiguration.getUsername() != null && grafanaConfiguration.getPassword() != null) {
            serviceAccountService.reload();
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
            datasourceService.deleteDatasource();
            datasourceService.createDatasource();
        }
    }


}
