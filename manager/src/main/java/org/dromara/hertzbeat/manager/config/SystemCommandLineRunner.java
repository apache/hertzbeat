package org.dromara.hertzbeat.manager.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.manager.GeneralConfig;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.pojo.dto.SystemConfig;
import org.dromara.hertzbeat.manager.service.impl.SystemGeneralConfigServiceImpl;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.Locale;
import java.util.TimeZone;

/**
 * @author ceilzcx
 * @since 4/7/2023
 */
@Component
public class SystemCommandLineRunner implements CommandLineRunner {
    
    private static final Integer LANG_REGION_LENGTH = 2;
    
    @Resource
    private SystemGeneralConfigServiceImpl systemGeneralConfigService;
    
    @Resource
    protected GeneralConfigDao generalConfigDao;
    
    @Resource
    protected ObjectMapper objectMapper;

    @Override
    public void run(String... args) throws Exception {
        SystemConfig systemConfig = systemGeneralConfigService.getConfig();
        if (systemConfig != null) {
            if (systemConfig.getTimeZoneId() != null) {
                TimeZone.setDefault(TimeZone.getTimeZone(systemConfig.getTimeZoneId()));
            }
            if (systemConfig.getLocale() != null) {
                String[] arr = systemConfig.getLocale().split(CommonConstants.LOCALE_SEPARATOR);
                if (arr.length == LANG_REGION_LENGTH) {
                    String language = arr[0];
                    String country = arr[1];
                    Locale.setDefault(new Locale(language, country));   
                }
            }
        } else {
            // init system config data
            systemConfig = SystemConfig.builder().timeZoneId(TimeZone.getDefault().getID())
                                   .locale(Locale.getDefault().getLanguage() + CommonConstants.LOCALE_SEPARATOR 
                                                   + Locale.getDefault().getCountry())
                                   .build();
            String contentJson = objectMapper.writeValueAsString(systemConfig);
            GeneralConfig generalConfig2Save = GeneralConfig.builder()
                                                       .type(systemGeneralConfigService.type())
                                                       .content(contentJson)
                                                       .build();
            generalConfigDao.save(generalConfig2Save);
        }
    }
}
