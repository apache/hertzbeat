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

package org.apache.hertzbeat.alert.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.config.SmsConfig;
import org.apache.hertzbeat.alert.service.impl.TencentSmsClientImpl;
import org.apache.hertzbeat.alert.service.impl.UniSmsClientImpl;
import org.apache.hertzbeat.alert.service.impl.AlibabaSmsClientImpl;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.support.event.SmsConfigChangeEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import static org.apache.hertzbeat.common.constants.SmsConstants.ALIBABA;
import static org.apache.hertzbeat.common.constants.SmsConstants.TENCENT;
import static org.apache.hertzbeat.common.constants.SmsConstants.UNISMS;

/**
 * SMS client factory
 */
@Slf4j
@Component
public class SmsClientFactory {

    private static final String TYPE = GeneralConfigTypeEnum.sms.name();

    private final GeneralConfigDao generalConfigDao;
    private final ObjectMapper objectMapper;
    private final SmsConfig yamlSmsConfig;

    private volatile SmsClient currentSmsClient;

    public SmsClientFactory(GeneralConfigDao generalConfigDao,
                            ObjectMapper objectMapper,
                            SmsConfig yamlSmsConfig) {
        this.generalConfigDao = generalConfigDao;
        this.objectMapper = objectMapper;
        this.yamlSmsConfig = yamlSmsConfig;
    }

    /**
     * SMS configuration change event listener
     */
    @EventListener(SmsConfigChangeEvent.class)
    public void onSmsConfigChange(SmsConfigChangeEvent event) {
        log.info("[SmsClientFactory] SMS configuration change event received");
        synchronized (this) {
            currentSmsClient = null;
        }
    }

    public SmsClient getSmsClient() {
        if (currentSmsClient != null) {
            return currentSmsClient;
        }
        synchronized (this) {
            if (currentSmsClient != null) {
                return currentSmsClient;
            }
            loadConfig();
            return currentSmsClient;
        }
    }

    private void loadConfig() {
        try {
            // 1. try to load database configuration
            SmsConfig dbConfig = loadDatabaseConfig();
            if (dbConfig != null && !dbConfig.getType().isBlank() && dbConfig.isEnable()) {
                createSmsClient(dbConfig);
                if (currentSmsClient != null) {
                    log.info("[SmsClientFactory] Using database SMS configuration, provider: {}", dbConfig.getType());
                    return;
                }
            }

            // 2. try to load YAML configuration
            if (yamlSmsConfig != null && !yamlSmsConfig.getType().isBlank() && yamlSmsConfig.isEnable()) {
                createSmsClient(yamlSmsConfig);
                if (currentSmsClient != null) {
                    log.info("[SmsClientFactory] Using YAML SMS configuration, provider: {}", yamlSmsConfig.getType());
                    return;
                }
            }

            log.warn("[SmsClientFactory] No valid SMS configuration found");

        } catch (Exception e) {
            log.error("[SmsClientFactory] Failed to load SMS configuration", e);
            currentSmsClient = null;
        }
    }

    private SmsConfig loadDatabaseConfig() {
        try {
            GeneralConfig config = generalConfigDao.findByType(TYPE);
            if (config != null && config.getContent() != null) {
                return objectMapper.readValue(config.getContent(), SmsConfig.class);
            }
        } catch (Exception e) {
            log.error("[SmsClientFactory] Failed to load database configuration", e);
        }
        return null;
    }

    private void createSmsClient(SmsConfig smsConfig) {
        switch (smsConfig.getType()) {
            case TENCENT:
                currentSmsClient = new TencentSmsClientImpl(smsConfig.getTencent());
                break;
            case UNISMS:
                currentSmsClient = new UniSmsClientImpl(smsConfig.getUnisms());
                break;
            case ALIBABA:
                currentSmsClient = new AlibabaSmsClientImpl(smsConfig.getAlibaba());
                break;
            default:
                log.warn("[SmsClientFactory] Unsupported SMS provider type: {}", smsConfig.getType());
                break;
        }
    }
} 