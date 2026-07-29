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

package org.apache.hertzbeat.manager.service.impl;

import tools.jackson.core.type.TypeReference;
import jakarta.annotation.Resource;
import java.lang.reflect.Type;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.constants.GeneralConfigTypeEnum;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.TimeZoneUtil;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfig;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfigRequest;
import org.apache.hertzbeat.manager.service.SystemConfigService;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * system config service impl
 */
@Service
public class SystemGeneralConfigServiceImpl extends AbstractGeneralConfigServiceImpl<SystemConfig>
        implements SystemConfigService {

    private static final Set<String> SUPPORTED_LOCALES =
            Set.of("en_US", "zh_CN", "zh_TW", "ja_JP", "pt_BR");
    private static final Set<String> SUPPORTED_THEMES =
            Set.of("dark-ops", "light-ops", "compact");
    private static final String DEFAULT_TIME_ZONE = "UTC";
    private static final String DEFAULT_LOCALE = "en_US";
    private static final String DEFAULT_THEME = "dark-ops";

    @Resource
    private ApplicationContext applicationContext;

    public SystemGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao) {
        super(generalConfigDao);
    }

    /**
     * Returns the canonical stored configuration, creating it from safe JVM defaults when absent.
     *
     * @return canonical stored configuration
     */
    @Transactional(rollbackFor = Exception.class)
    public SystemConfig initializeCanonicalConfig() {
        generalConfigDao.findByTypeForUpdate(type());
        SystemConfig persisted = readPersisted();
        if (persisted != null) {
            if (!isCanonical(persisted)) {
                return persistCanonical(canonicalize(persisted));
            }
            applicationContext.publishEvent(new SystemConfigPersistedEvent(persisted));
            return persisted;
        }
        Locale locale = Locale.getDefault();
        String localeId = locale.getLanguage() + "_" + locale.getCountry();
        return persistCanonical(canonicalize(
                new SystemConfig(TimeZone.getDefault().getID(), localeId, DEFAULT_THEME)));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveConfig(SystemConfig systemConfig) {
        validate(systemConfig);
        persistAndRead(systemConfig);
    }

    /**
     * Saves the typed system configuration and returns the authoritative persisted value.
     *
     * @param request requested system configuration
     * @return authoritative persisted system configuration
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public SystemConfig saveAndGetConfig(SystemConfigRequest request) {
        if (request == null || request.isUnknownFieldPresent()) {
            throw new IllegalArgumentException("Unsupported system config");
        }
        SystemConfig systemConfig =
                new SystemConfig(request.getTimeZoneId(), request.getLocale(), request.getTheme());
        validate(systemConfig);
        return persistAndRead(systemConfig);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public synchronized void applyCommittedConfig(SystemConfigPersistedEvent event) {
        SystemConfig config = event.config();
        TimeZoneUtil.setTimeZoneAndLocale(config.getTimeZoneId(), config.getLocale());
        applicationContext.publishEvent(new SystemConfigChangeEvent(applicationContext));
    }

    @Override
    public String type() {
        return GeneralConfigTypeEnum.system.name();
    }

    @Override
    public TypeReference<SystemConfig> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return SystemConfig.class;
            }
        };
    }

    private void validate(SystemConfig systemConfig) {
        if (systemConfig == null
                || !ZoneId.getAvailableZoneIds().contains(systemConfig.getTimeZoneId())
                || !SUPPORTED_LOCALES.contains(systemConfig.getLocale())
                || !SUPPORTED_THEMES.contains(systemConfig.getTheme())) {
            throw new IllegalArgumentException("Unsupported system config");
        }
    }

    private SystemConfig persistAndRead(SystemConfig systemConfig) {
        generalConfigDao.findByTypeForUpdate(type());
        return persistCanonical(systemConfig);
    }

    private SystemConfig persistCanonical(SystemConfig systemConfig) {
        String content = JsonUtil.toJson(systemConfig);
        if (content == null) {
            throw new IllegalStateException("System config serialization failed");
        }
        generalConfigDao.save(GeneralConfig.builder()
                .type(type())
                .content(content)
                .build());
        SystemConfig saved = readPersisted();
        if (saved == null) {
            throw new IllegalStateException("System config missing after save");
        }
        applicationContext.publishEvent(new SystemConfigPersistedEvent(saved));
        return saved;
    }

    private SystemConfig readPersisted() {
        return super.getConfig();
    }

    private boolean isCanonical(SystemConfig config) {
        return config.equals(canonicalize(config));
    }

    private SystemConfig canonicalize(SystemConfig config) {
        String timeZoneId = ZoneId.getAvailableZoneIds().contains(config.getTimeZoneId())
                ? config.getTimeZoneId()
                : DEFAULT_TIME_ZONE;
        String locale = SUPPORTED_LOCALES.contains(config.getLocale()) ? config.getLocale() : DEFAULT_LOCALE;
        String theme = SUPPORTED_THEMES.contains(config.getTheme()) ? config.getTheme() : DEFAULT_THEME;
        return new SystemConfig(timeZoneId, locale, theme);
    }

    public record SystemConfigPersistedEvent(SystemConfig config) {
    }
}
