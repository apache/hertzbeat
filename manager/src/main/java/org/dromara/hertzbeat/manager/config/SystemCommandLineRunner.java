package org.dromara.hertzbeat.manager.config;

import org.dromara.hertzbeat.manager.pojo.dto.SystemConfig;
import org.dromara.hertzbeat.manager.service.impl.SystemGeneralConfigServiceImpl;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.TimeZone;

/**
 * @author ceilzcx
 * @since 4/7/2023
 */
@Component
public class SystemCommandLineRunner implements CommandLineRunner {
    @Resource
    private SystemGeneralConfigServiceImpl systemGeneralConfigService;

    @Override
    public void run(String... args) throws Exception {
        SystemConfig systemConfig = systemGeneralConfigService.getConfig();
        if (systemConfig != null) {
            TimeZone.setDefault(TimeZone.getTimeZone(systemConfig.getTimeZoneId()));
        }
    }
}
