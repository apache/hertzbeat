package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.manager.GeneralConfig;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.service.GeneralConfigService;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
abstract class AbstractGeneralConfigServiceImpl<T> implements GeneralConfigService<T> {
    protected final GeneralConfigDao generalConfigDao;
    protected final ObjectMapper objectMapper;
    protected Byte type;
    protected boolean enabled;

    protected AbstractGeneralConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper, Byte type) {
        this.generalConfigDao = generalConfigDao;
        this.objectMapper = objectMapper;
        this.type = type;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void saveConfig(T config, boolean enabled) {
        try {
            String contentJson = objectMapper.writeValueAsString(config);

            GeneralConfig generalConfig2Save = GeneralConfig.builder()
                    .type(type)
                    .enabled(enabled)
                    .content(contentJson)
                    .build();
            generalConfigDao.save(generalConfig2Save);
            log.info("配置保存成功|Configuration saved successfully");
        } catch (JsonProcessingException e) {
            throw new RuntimeException("配置保存失败|Configuration saved failed");
        }
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void deleteConfig() {
        int count = generalConfigDao.deleteByType(type);
        if (count == 0) {
            throw new RuntimeException(("配置已被删除，无法再次被删除|Configuration has been deleted and cannot be deleted again"));
        }
        if (count > 1) {
            log.warn("配置项有多个，{}个配置项被删除|Configuration has multiple items and {} items were deleted", count, count);
        }
        log.info("配置项删除成功|Configuration deleted successfully");
    }

    @Override
    public T getConfig() {
        GeneralConfig generalConfig = generalConfigDao.findByType(type);
        if (generalConfig == null) {
            return null;
        }
        try {
            return objectMapper.readValue(generalConfig.getContent(), getTypeReference());
        } catch (JsonProcessingException e) {
            throw new RuntimeException("获取设备失败|Get configuration failed");
        }
    }
    protected abstract TypeReference<T> getTypeReference();

}
