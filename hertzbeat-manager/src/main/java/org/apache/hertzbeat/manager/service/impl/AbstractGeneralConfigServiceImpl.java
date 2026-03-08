package org.apache.hertzbeat.manager.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.base.service.GeneralConfigService;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;

/**
 * <p>Abstract implementation of GeneralConfigService, providing CRUD operations for configurations.</p>
 */
@Slf4j
abstract class AbstractGeneralConfigServiceImpl<T> implements GeneralConfigService<T> {

    protected final GeneralConfigDao generalConfigDao;

    protected AbstractGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao) {
        this.generalConfigDao = generalConfigDao;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void saveConfig(T config) {
        String contentJson = JsonUtil.toJson(config);
        if (contentJson == null) {
            log.error("Failed to serialize configuration for type {}", type());
            throw new RuntimeException("Save config failed: serialization error");
        }
        GeneralConfig generalConfig2Save = GeneralConfig.builder()
            .type(type())
            .content(contentJson)
            .build();
        generalConfigDao.save(generalConfig2Save);
        log.info("Configuration of type {} saved successfully", type());
        handler(getConfig());
    }

    @Override
    public T getConfig() {
        GeneralConfig generalConfig = generalConfigDao.findByType(type());
        if (generalConfig == null) {
            return null;
        }
        return JsonUtil.fromJson(generalConfig.getContent(), getTypeReference());
    }

    protected abstract TypeReference<T> getTypeReference();
}
