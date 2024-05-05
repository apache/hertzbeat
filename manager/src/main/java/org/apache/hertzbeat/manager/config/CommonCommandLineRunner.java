/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usthe.sureness.util.JsonWebTokenUtil;
import jakarta.annotation.Resource;
import java.util.Locale;
import java.util.Random;
import java.util.TimeZone;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.manager.dao.GeneralConfigDao;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfig;
import org.apache.hertzbeat.manager.pojo.dto.SystemSecret;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.impl.SystemGeneralConfigServiceImpl;
import org.apache.hertzbeat.manager.service.impl.SystemSecretServiceImpl;
import org.apache.hertzbeat.manager.service.impl.TemplateConfigServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Common CommandLineRunner class
 */
@Component
@Order(value = Ordered.HIGHEST_PRECEDENCE + 2)
public class CommonCommandLineRunner implements CommandLineRunner {
    
    private static final Integer LANG_REGION_LENGTH = 2;
    
    private static final String DEFAULT_JWT_SECRET = "CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R " 
            + "LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9 "
            + "8tVt4bisXQ13rbN0oxhUZR73M6EByXIO+SV5 "
            + "dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp";
    
    @Value("${sureness.jwt.secret:" + DEFAULT_JWT_SECRET + "}")
    private String currentJwtSecret;
    
    @Resource
    private SystemGeneralConfigServiceImpl systemGeneralConfigService;
    
    @Resource
    private SystemSecretServiceImpl systemSecretService;
    
    @Resource
    private TemplateConfigServiceImpl templateConfigService;
    
    @Resource
    private AppService appService;
    
    @Resource
    protected GeneralConfigDao generalConfigDao;
    
    @Resource
    protected ObjectMapper objectMapper;

    @Override
    public void run(String... args) throws Exception {
        // for system config
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
        // for template config, flush the template config in db to memory
        TemplateConfig templateConfig = templateConfigService.getConfig();
        appService.updateCustomTemplateConfig(templateConfig);
        // for system secrets
        if (DEFAULT_JWT_SECRET.equals(currentJwtSecret)) {
            // use the random jwt secret
            SystemSecret systemSecret = systemSecretService.getConfig();
            if (systemSecret == null || !StringUtils.hasText(systemSecret.getJwtSecret())) {
                char[] chars = DEFAULT_JWT_SECRET.toCharArray();
                Random rand = new Random();
                for (int i = 0; i < chars.length; i++) {
                    int index = rand.nextInt(chars.length);
                    char temp = chars[i];
                    chars[i] = chars[index];
                    chars[index] = temp;
                }
                currentJwtSecret = new String(chars);
                systemSecret = SystemSecret.builder().jwtSecret(currentJwtSecret).build();
                systemSecretService.saveConfig(systemSecret);
            } else {
                currentJwtSecret = systemSecret.getJwtSecret();
            }
        }
        // else use the user custom jwt secret
        // set the jwt secret token in util
        JsonWebTokenUtil.setDefaultSecretKey(currentJwtSecret);
    }
}
